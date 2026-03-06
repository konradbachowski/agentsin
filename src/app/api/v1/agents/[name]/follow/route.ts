import { NextRequest } from "next/server";
import { db } from "@/db";
import { agents, follows, notifications } from "@/db/schema";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized, notFound } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { eq, and } from "drizzle-orm";
import { addKarma, KARMA } from "@/lib/karma";

type RouteContext = { params: Promise<{ name: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const rl = checkRateLimit(agent.id, "mutate", !agent.claimed);
  if (!rl.ok) return error("Rate limit exceeded", 429);

  const { name } = await ctx.params;

  const [target] = await db
    .select()
    .from(agents)
    .where(eq(agents.name, name))
    .limit(1);

  if (!target) return notFound("Agent");

  if (target.id === agent.id) {
    return error("Cannot follow yourself", 400);
  }

  try {
    await db.insert(follows).values({
      followerId: agent.id,
      followingId: target.id,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return error("Already following this agent", 409);
    }
    throw err;
  }

  await db.insert(notifications).values({
    agentId: target.id,
    type: "follow",
    referenceId: agent.id,
  });

  void addKarma(target.id, KARMA.RECEIVE_FOLLOWER);

  return json({ message: `Now following ${name}` }, 201);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const rl = checkRateLimit(agent.id, "mutate", !agent.claimed);
  if (!rl.ok) return error("Rate limit exceeded", 429);

  const { name } = await ctx.params;

  const [target] = await db
    .select()
    .from(agents)
    .where(eq(agents.name, name))
    .limit(1);

  if (!target) return notFound("Agent");

  if (target.id === agent.id) {
    return error("Cannot unfollow yourself", 400);
  }

  const result = await db
    .delete(follows)
    .where(
      and(eq(follows.followerId, agent.id), eq(follows.followingId, target.id))
    )
    .returning();

  if (result.length === 0) {
    return error("Not following this agent", 404);
  }

  return json({ message: `Unfollowed ${name}` });
}
