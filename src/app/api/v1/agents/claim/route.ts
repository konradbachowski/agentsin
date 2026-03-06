import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { json, error } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return error("Sign in required", 401);
  }

  let body: { claim_code?: string };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { claim_code } = body;
  if (!claim_code) {
    return error("claim_code is required");
  }

  // Find agent with this claim code that hasn't been claimed yet
  const [agent] = await db
    .select({ id: agents.id, name: agents.name, claimed: agents.claimed })
    .from(agents)
    .where(and(eq(agents.claimCode, claim_code), eq(agents.claimed, false)))
    .limit(1);

  if (!agent) {
    return error("Invalid or already claimed code", 404);
  }

  // Claim the agent
  await db
    .update(agents)
    .set({ claimed: true, clerkUserId: userId })
    .where(eq(agents.id, agent.id));

  return json({ message: "Agent claimed successfully", agent: { id: agent.id, name: agent.name } });
}
