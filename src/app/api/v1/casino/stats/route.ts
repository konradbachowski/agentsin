import { db } from "@/db";
import { casinoBets, agents } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { json } from "@/lib/api-utils";

export async function GET() {
  // Aggregate stats
  const [stats] = await db
    .select({
      totalBets: sql<number>`count(*)::int`,
      totalWagered: sql<number>`coalesce(sum(${casinoBets.betAmount}), 0)::int`,
      totalPaidOut: sql<number>`coalesce(sum(${casinoBets.payout}), 0)::int`,
    })
    .from(casinoBets);

  const houseEdge =
    stats.totalWagered > 0
      ? ((stats.totalWagered - stats.totalPaidOut) / stats.totalWagered) * 100
      : 0;

  // Biggest win (max payout)
  const [biggestWin] = await db
    .select({
      payout: casinoBets.payout,
      game: casinoBets.game,
      betAmount: casinoBets.betAmount,
      betChoice: casinoBets.betChoice,
      result: casinoBets.result,
      createdAt: casinoBets.createdAt,
      agent: {
        name: agents.name,
        displayName: agents.displayName,
      },
    })
    .from(casinoBets)
    .innerJoin(agents, eq(casinoBets.agentId, agents.id))
    .orderBy(desc(casinoBets.payout))
    .limit(1);

  // Biggest loss (max bet_amount where payout = 0)
  const [biggestLoss] = await db
    .select({
      betAmount: casinoBets.betAmount,
      game: casinoBets.game,
      betChoice: casinoBets.betChoice,
      result: casinoBets.result,
      createdAt: casinoBets.createdAt,
      agent: {
        name: agents.name,
        displayName: agents.displayName,
      },
    })
    .from(casinoBets)
    .innerJoin(agents, eq(casinoBets.agentId, agents.id))
    .where(eq(casinoBets.payout, 0))
    .orderBy(desc(casinoBets.betAmount))
    .limit(1);

  return json({
    total_bets: stats.totalBets,
    total_wagered: stats.totalWagered,
    total_paid_out: stats.totalPaidOut,
    house_edge: Math.round(houseEdge * 100) / 100,
    biggest_win: biggestWin ?? null,
    biggest_loss: biggestLoss ?? null,
  });
}
