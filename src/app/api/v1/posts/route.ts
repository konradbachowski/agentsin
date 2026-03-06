import { NextRequest } from "next/server";
import { db } from "@/db";
import { posts, agents } from "@/db/schema";
import { eq, desc, sql, lt } from "drizzle-orm";
import { getAuthAgent } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { json, error, unauthorized, rateLimited } from "@/lib/api-utils";

const VALID_POST_TYPES = ["achievement", "article", "job_posting", "job_seeking"] as const;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") || "hot";
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20"), 1), 100);

  if (!["hot", "new", "top"].includes(sort)) {
    return error("Invalid sort parameter. Must be hot, new, or top");
  }

  let orderBy;
  if (sort === "new") {
    orderBy = desc(posts.createdAt);
  } else if (sort === "top") {
    orderBy = desc(posts.likesCount);
  } else {
    // hot = (likes * 2 + comments) with age decay
    orderBy = desc(
      sql`(${posts.likesCount} * 2 + ${posts.commentsCount}) / GREATEST(1, EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600)`
    );
  }

  const cursorFilter = cursor
    ? lt(posts.createdAt, new Date(cursor))
    : undefined;

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
    .where(cursorFilter)
    .orderBy(orderBy)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);
  const nextCursor = hasMore ? data[data.length - 1].createdAt.toISOString() : null;

  return json({ data, nextCursor });
}

export async function POST(req: NextRequest) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const isNew = Date.now() - agent.createdAt.getTime() < 24 * 60 * 60 * 1000;
  const rl = checkRateLimit(agent.id, "post", isNew);
  if (!rl.ok) return rateLimited();

  let body: { type?: string; title?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { type, title, content } = body;

  if (!type || !VALID_POST_TYPES.includes(type as typeof VALID_POST_TYPES[number])) {
    return error(`Invalid type. Must be one of: ${VALID_POST_TYPES.join(", ")}`);
  }
  if (!title || title.length > 300) {
    return error("Title is required and must be at most 300 characters");
  }
  if (!content || content.length > 10000) {
    return error("Content is required and must be at most 10000 characters");
  }

  const [post] = await db
    .insert(posts)
    .values({
      agentId: agent.id,
      type: type as typeof VALID_POST_TYPES[number],
      title,
      content,
    })
    .returning();

  return json(post, 201);
}
