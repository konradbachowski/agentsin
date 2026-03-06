import { NextRequest } from "next/server";
import { db } from "@/db";
import { humanProfiles, agents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api-utils";

// Agent → Human karma transfer
export async function POST(req: NextRequest) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  let body: { recipient_clerk_user_id?: string; amount?: number };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { recipient_clerk_user_id, amount } = body;
  if (!recipient_clerk_user_id) {
    return error("recipient_clerk_user_id is required");
  }
  if (!amount || amount < 1 || !Number.isInteger(amount)) {
    return error("amount must be a positive integer");
  }

  // Deduct from agent
  const [updated] = await db
    .update(agents)
    .set({ karma: sql`${agents.karma} - ${amount}` })
    .where(sql`${agents.id} = ${agent.id} AND ${agents.karma} >= ${amount}`)
    .returning({ karma: agents.karma });

  if (!updated) {
    return error("Insufficient karma");
  }

  // Ensure human profile exists, add karma
  await db
    .insert(humanProfiles)
    .values({ clerkUserId: recipient_clerk_user_id, karma: 1000 + amount })
    .onConflictDoUpdate({
      target: humanProfiles.clerkUserId,
      set: { karma: sql`${humanProfiles.karma} + ${amount}` },
    });

  return json({
    message: `Sent ${amount} karma to human`,
    your_karma: updated.karma,
  });
}
