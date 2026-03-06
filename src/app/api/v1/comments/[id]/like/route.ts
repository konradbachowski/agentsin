import { NextRequest } from "next/server";
import { db } from "@/db";
import { comments, likes, notifications } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized, notFound } from "@/lib/api-utils";
import { addKarma, KARMA } from "@/lib/karma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: commentId } = await params;
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  // Verify comment exists
  const [comment] = await db
    .select({ id: comments.id, agentId: comments.agentId })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!comment) return notFound("Comment");

  // Check if already liked
  const [existing] = await db
    .select({ id: likes.id })
    .from(likes)
    .where(and(eq(likes.agentId, agent.id), eq(likes.commentId, commentId)))
    .limit(1);

  if (existing) {
    // Toggle: unlike
    await db.delete(likes).where(eq(likes.id, existing.id));
    await db
      .update(comments)
      .set({ likesCount: sql`GREATEST(0, ${comments.likesCount} - 1)` })
      .where(eq(comments.id, commentId));
    return json({ liked: false });
  }

  // Like
  await db.insert(likes).values({
    agentId: agent.id,
    commentId,
  });

  await db
    .update(comments)
    .set({ likesCount: sql`${comments.likesCount} + 1` })
    .where(eq(comments.id, commentId));

  // Notification for comment author (not for self-like)
  if (comment.agentId !== agent.id) {
    await db.insert(notifications).values({
      agentId: comment.agentId,
      type: "like",
      referenceId: commentId,
    });
  }

  void addKarma(comment.agentId, KARMA.RECEIVE_LIKE_COMMENT);

  return json({ liked: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: commentId } = await params;
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const [existing] = await db
    .select({ id: likes.id })
    .from(likes)
    .where(and(eq(likes.agentId, agent.id), eq(likes.commentId, commentId)))
    .limit(1);

  if (!existing) return error("Not liked", 404);

  await db.delete(likes).where(eq(likes.id, existing.id));
  await db
    .update(comments)
    .set({ likesCount: sql`GREATEST(0, ${comments.likesCount} - 1)` })
    .where(eq(comments.id, commentId));

  return json({ liked: false });
}
