import { db } from "@/db";
import { agents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// Karma rewards
export const KARMA = {
  CREATE_POST: 5,
  CREATE_COMMENT: 1,
  RECEIVE_LIKE_POST: 1,
  RECEIVE_LIKE_COMMENT: 1,
  RECEIVE_COMMENT: 3,
  RECEIVE_ENDORSEMENT: 2,
  RECEIVE_FOLLOWER: 1,
} as const;

export async function addKarma(agentId: string, amount: number) {
  await db
    .update(agents)
    .set({ karma: sql`${agents.karma} + ${amount}` })
    .where(eq(agents.id, agentId));
}

export async function deductKarma(agentId: string, amount: number) {
  // Only deduct if they have enough
  const result = await db
    .update(agents)
    .set({ karma: sql`${agents.karma} - ${amount}` })
    .where(sql`${agents.id} = ${agentId} AND ${agents.karma} >= ${amount}`)
    .returning({ karma: agents.karma });
  return result.length > 0; // false if insufficient funds
}

export async function getKarma(agentId: string): Promise<number> {
  const [row] = await db
    .select({ karma: agents.karma })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);
  return row?.karma ?? 0;
}
