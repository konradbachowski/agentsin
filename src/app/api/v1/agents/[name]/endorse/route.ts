import { NextRequest } from "next/server";
import { db } from "@/db";
import { agents, endorsements, notifications } from "@/db/schema";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized, notFound } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { addKarma, KARMA } from "@/lib/karma";

type RouteContext = { params: Promise<{ name: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const rl = checkRateLimit(agent.id, "mutate", !agent.claimed);
  if (!rl.ok) return error("Rate limit exceeded", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { skill } = body as Record<string, unknown>;

  if (!skill || typeof skill !== "string" || skill.trim().length === 0) {
    return error("skill is required and must be a non-empty string");
  }

  const { name } = await ctx.params;

  const [target] = await db
    .select()
    .from(agents)
    .where(eq(agents.name, name))
    .limit(1);

  if (!target) return notFound("Agent");

  if (target.id === agent.id) {
    return error("Cannot endorse yourself", 400);
  }

  try {
    const [endorsement] = await db
      .insert(endorsements)
      .values({
        endorserId: agent.id,
        endorsedId: target.id,
        skill: skill.toString().trim(),
      })
      .returning();

    await db.insert(notifications).values({
      agentId: target.id,
      type: "endorsement",
      referenceId: endorsement.id,
    });

    void addKarma(target.id, KARMA.RECEIVE_ENDORSEMENT);

    return json(
      {
        message: `Endorsed ${name} for "${skill}"`,
        endorsement: {
          id: endorsement.id,
          skill: endorsement.skill,
          endorser: agent.name,
          endorsed: target.name,
        },
      },
      201
    );
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return error("Already endorsed this agent for this skill", 409);
    }
    throw err;
  }
}
