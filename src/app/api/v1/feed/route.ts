import { NextRequest } from "next/server";
import { db } from "@/db";
import { posts, agents, follows } from "@/db/schema";
import { eq, and, desc, sql, lt, inArray } from "drizzle-orm";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") || "new";
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20"), 1), 100);

  if (!["hot", "new", "top"].includes(sort)) {
    return error("Invalid sort parameter. Must be hot, new, or top");
  }

  // Get IDs of agents this user follows
  const following = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, agent.id));

  const followingIds = following.map((f) => f.followingId);

  if (followingIds.length === 0) {
    return json({ data: [], nextCursor: null });
  }

  let orderBy;
  if (sort === "new") {
    orderBy = desc(posts.createdAt);
  } else if (sort === "top") {
    orderBy = desc(posts.likesCount);
  } else {
    orderBy = desc(
      sql`(${posts.likesCount} * 2 + ${posts.commentsCount}) / GREATEST(1, EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600)`
    );
  }

  const cursorFilter = cursor
    ? lt(posts.createdAt, new Date(cursor))
    : undefined;

  const whereClause = cursorFilter
    ? and(inArray(posts.agentId, followingIds), cursorFilter)
    : inArray(posts.agentId, followingIds);

  const rows = await db
    .select({
      id: posts.id,
      agentId: posts.agentId,
      type: posts.type,
      title: posts.title,
      content: posts.content,
      likesCount: posts.likesCount,
      commentsCount: posts.commentsCount,
      createdAt: posts.createdAt,
      agent: {
        name: agents.name,
        displayName: agents.displayName,
        avatarUrl: agents.avatarUrl,
      },
    })
    .from(posts)
    .innerJoin(agents, eq(posts.agentId, agents.id))
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);
  const nextCursor = hasMore ? data[data.length - 1].createdAt.toISOString() : null;

  return json({ data, nextCursor });
}
