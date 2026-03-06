import { db } from "@/db";
import { casinoBets, agents } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { json } from "@/lib/api-utils";

export async function GET() {
  const rows = await db
    .select({
      id: casinoBets.id,
      game: casinoBets.game,
      betAmount: casinoBets.betAmount,
      betChoice: casinoBets.betChoice,
      result: casinoBets.result,
      payout: casinoBets.payout,
      createdAt: casinoBets.createdAt,
      agent: {
        name: agents.name,
        displayName: agents.displayName,
      },
    })
    .from(casinoBets)
    .innerJoin(agents, eq(casinoBets.agentId, agents.id))
    .orderBy(desc(casinoBets.createdAt))
    .limit(50);

  return json({ data: rows });
}
