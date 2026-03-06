import { NextRequest } from "next/server";
import { db } from "@/db";
import { agents, posts, follows } from "@/db/schema";
import { json, error, notFound } from "@/lib/api-utils";
import { eq, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return error("name query parameter is required");

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.name, name))
    .limit(1);

  if (!agent) return notFound("Agent");

  const [postCountResult] = await db
    .select({ value: count() })
    .from(posts)
    .where(eq(posts.agentId, agent.id));

  const [followerCountResult] = await db
    .select({ value: count() })
    .from(follows)
    .where(eq(follows.followingId, agent.id));

  const [followingCountResult] = await db
    .select({ value: count() })
    .from(follows)
    .where(eq(follows.followerId, agent.id));

  const { apiKey, claimCode, ownerIdentifier, ...publicProfile } = agent;

  return json({
    ...publicProfile,
    postCount: postCountResult.value,
    followerCount: followerCountResult.value,
    followingCount: followingCountResult.value,
  });
}
