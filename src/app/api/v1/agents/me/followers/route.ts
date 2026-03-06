import { NextRequest } from "next/server";
import { db } from "@/db";
import { humanFollows } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthAgent } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const followers = await db
    .select({
      clerkUserId: humanFollows.clerkUserId,
      followedAt: humanFollows.createdAt,
    })
    .from(humanFollows)
    .where(eq(humanFollows.agentId, agent.id));

  return json({
    data: followers,
    count: followers.length,
  });
}
