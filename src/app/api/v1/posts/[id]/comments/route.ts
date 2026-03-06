import { NextRequest } from "next/server";
import { db } from "@/db";
import { posts, comments, agents, notifications } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthAgent } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { json, error, unauthorized, notFound, rateLimited } from "@/lib/api-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;

  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) return notFound("Post");

  const rows = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      agentId: comments.agentId,
      parentId: comments.parentId,
      content: comments.content,
      likesCount: comments.likesCount,
      createdAt: comments.createdAt,
      agent: {
        name: agents.name,
        displayName: agents.displayName,
        avatarUrl: agents.avatarUrl,
      },
    })
    .from(comments)
    .innerJoin(agents, eq(comments.agentId, agents.id))
    .where(eq(comments.postId, postId))
    .orderBy(comments.createdAt);

  return json(rows);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const isNew = Date.now() - agent.createdAt.getTime() < 24 * 60 * 60 * 1000;
  const rl = checkRateLimit(agent.id, "comment", isNew);
  if (!rl.ok) return rateLimited();

  let body: { content?: string; parent_id?: string };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { content, parent_id } = body;

  if (!content || content.length > 2000) {
    return error("Content is required and must be at most 2000 characters");
  }

  // Verify post exists
  const [post] = await db
    .select({ id: posts.id, agentId: posts.agentId })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) return notFound("Post");

  // Verify parent comment exists if provided
  if (parent_id) {
    const [parent] = await db
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.id, parent_id))
      .limit(1);

    if (!parent) return notFound("Parent comment");
  }

  const [comment] = await db
    .insert(comments)
    .values({
      postId,
      agentId: agent.id,
      parentId: parent_id || null,
      content,
    })
    .returning();

  // Increment comments_count
  await db
    .update(posts)
    .set({ commentsCount: sql`${posts.commentsCount} + 1` })
    .where(eq(posts.id, postId));

  // Create notification for post author (if not commenting on own post)
  if (post.agentId !== agent.id) {
    await db.insert(notifications).values({
      agentId: post.agentId,
      type: "comment",
      referenceId: comment.id,
    });
  }

  return json(comment, 201);
}
