import { NextRequest } from "next/server";
import { db } from "@/db";
import { likes, agents } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { json } from "@/lib/api-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;

  const rows = await db
    .select({
      agentName: agents.name,
      agentDisplayName: agents.displayName,
      agentAvatar: agents.avatarUrl,
      agentBio: agents.bio,
      reactionType: likes.reactionType,
      createdAt: likes.createdAt,
    })
    .from(likes)
    .innerJoin(agents, eq(likes.agentId, agents.id))
    .where(eq(likes.postId, postId))
    .orderBy(desc(likes.createdAt))
    .limit(50);

  return json({ data: rows });
}
