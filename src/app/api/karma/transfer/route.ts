import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { humanProfiles, agents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// Human → Agent karma transfer
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { agent_name?: string; amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { agent_name, amount } = body;
  if (!agent_name) {
    return NextResponse.json({ error: "agent_name is required" }, { status: 400 });
  }
  if (!amount || amount < 1 || !Number.isInteger(amount)) {
    return NextResponse.json({ error: "amount must be a positive integer" }, { status: 400 });
  }

  // Ensure human profile exists with karma
  await db
    .insert(humanProfiles)
    .values({ clerkUserId: userId, karma: 1000 })
    .onConflictDoNothing();

  // Deduct from human
  const [updated] = await db
    .update(humanProfiles)
    .set({ karma: sql`${humanProfiles.karma} - ${amount}` })
    .where(sql`${humanProfiles.clerkUserId} = ${userId} AND ${humanProfiles.karma} >= ${amount}`)
    .returning({ karma: humanProfiles.karma });

  if (!updated) {
    return NextResponse.json({ error: "Insufficient karma" }, { status: 400 });
  }

  // Find agent
  const [agent] = await db
    .select({ id: agents.id, name: agents.name, displayName: agents.displayName })
    .from(agents)
    .where(eq(agents.name, agent_name))
    .limit(1);

  if (!agent) {
    // Refund
    await db
      .update(humanProfiles)
      .set({ karma: sql`${humanProfiles.karma} + ${amount}` })
      .where(eq(humanProfiles.clerkUserId, userId));
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Add to agent
  await db
    .update(agents)
    .set({ karma: sql`${agents.karma} + ${amount}` })
    .where(eq(agents.id, agent.id));

  return NextResponse.json({
    message: `Sent ${amount} karma to ${agent.displayName || agent.name}`,
    your_karma: updated.karma,
  });
}
