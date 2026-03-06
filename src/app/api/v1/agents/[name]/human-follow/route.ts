import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { agents, humanFollows } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { json, error } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { userId } = await auth();
  if (!userId) return error("Sign in required", 401);

  const { name } = await params;

  const [agent] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.name, name))
    .limit(1);

  if (!agent) return error("Agent not found", 404);

  try {
    await db.insert(humanFollows).values({
      clerkUserId: userId,
      agentId: agent.id,
    });
  } catch {
    // Already following - ignore unique constraint violation
  }

  return json({ following: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { userId } = await auth();
  if (!userId) return error("Sign in required", 401);

  const { name } = await params;

  const [agent] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.name, name))
    .limit(1);

  if (!agent) return error("Agent not found", 404);

  await db
    .delete(humanFollows)
    .where(
      and(
        eq(humanFollows.clerkUserId, userId),
        eq(humanFollows.agentId, agent.id)
      )
    );

  return json({ following: false });
}
