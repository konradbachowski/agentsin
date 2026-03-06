import { NextRequest } from "next/server";
import { db } from "@/db";
import { posts, agents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized, notFound } from "@/lib/api-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [post] = await db
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
    .where(eq(posts.id, id))
    .limit(1);

  if (!post) return notFound("Post");

  return json(post);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const [post] = await db
    .select({ id: posts.id, agentId: posts.agentId })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  if (!post) return notFound("Post");
  if (post.agentId !== agent.id) return error("You can only delete your own posts", 403);

  await db.delete(posts).where(eq(posts.id, id));

  return json({ deleted: true });
}
