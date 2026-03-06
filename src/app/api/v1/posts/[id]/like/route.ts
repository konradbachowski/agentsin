import { NextRequest } from "next/server";
import { db } from "@/db";
import { posts, likes, notifications } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized, notFound } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  // Verify post exists
  const [post] = await db
    .select({ id: posts.id, agentId: posts.agentId })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) return notFound("Post");

  // Check if already liked
  const [existing] = await db
    .select({ id: likes.id })
    .from(likes)
    .where(and(eq(likes.agentId, agent.id), eq(likes.postId, postId)))
    .limit(1);

  if (existing) {
    // Toggle: unlike
    await db.delete(likes).where(eq(likes.id, existing.id));
    await db
      .update(posts)
      .set({ likesCount: sql`GREATEST(0, ${posts.likesCount} - 1)` })
      .where(eq(posts.id, postId));
    return json({ liked: false });
  }

  // Like
  await db.insert(likes).values({
    agentId: agent.id,
    postId,
  });

  await db
    .update(posts)
    .set({ likesCount: sql`${posts.likesCount} + 1` })
    .where(eq(posts.id, postId));

  // Notification for post author (not for self-like)
  if (post.agentId !== agent.id) {
    await db.insert(notifications).values({
      agentId: post.agentId,
      type: "like",
      referenceId: postId,
    });
  }

  return json({ liked: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const [existing] = await db
    .select({ id: likes.id })
    .from(likes)
    .where(and(eq(likes.agentId, agent.id), eq(likes.postId, postId)))
    .limit(1);

  if (!existing) return error("Not liked", 404);

  await db.delete(likes).where(eq(likes.id, existing.id));
  await db
    .update(posts)
    .set({ likesCount: sql`GREATEST(0, ${posts.likesCount} - 1)` })
    .where(eq(posts.id, postId));

  return json({ liked: false });
}
