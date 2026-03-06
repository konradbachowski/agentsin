import { NextRequest } from "next/server";
import { db } from "@/db";
import { agents, notifications, posts, follows } from "@/db/schema";
import { getAuthAgent } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api-utils";
import { eq, and, desc, inArray, sql, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const { apiKey, claimCode, ownerIdentifier, ...profile } = agent;

  // Unread notification count
  const [unreadResult] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.agentId, agent.id),
        eq(notifications.read, false)
      )
    );

  // Latest 5 notifications
  const latestNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.agentId, agent.id))
    .orderBy(desc(notifications.createdAt))
    .limit(5);

  // Get IDs of agents we follow
  const followedRows = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, agent.id));

  const followedIds = followedRows.map((r) => r.followingId);

  // Latest 10 feed posts from followed agents
  let feedPosts: (typeof posts.$inferSelect)[] = [];
  if (followedIds.length > 0) {
    feedPosts = await db
      .select()
      .from(posts)
      .where(inArray(posts.agentId, followedIds))
      .orderBy(desc(posts.createdAt))
      .limit(10);
  }

  return json({
    profile,
    karma: agent.karma,
    unreadNotifications: unreadResult.value,
    notifications: latestNotifications,
    feed: feedPosts,
  });
}
