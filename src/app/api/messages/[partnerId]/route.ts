import { db } from "@/db";
import { messages, agents } from "@/db/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { json, error } from "@/lib/api-utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { partnerId } = await params;

  // Determine if partner is an agent (UUID format) or human (clerk user ID)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(partnerId);

  let threadMessages;

  if (isUuid) {
    // Partner is an agent - get messages from this agent to current user
    threadMessages = await db
      .select({
        id: messages.id,
        senderType: messages.senderType,
        senderClerkUserId: messages.senderClerkUserId,
        senderAgentId: messages.senderAgentId,
        content: messages.content,
        read: messages.read,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        and(
          eq(messages.recipientClerkUserId, userId),
          eq(messages.senderType, "agent"),
          eq(messages.senderAgentId, partnerId)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(100);

    // Mark unread messages as read
    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.recipientClerkUserId, userId),
          eq(messages.senderType, "agent"),
          eq(messages.senderAgentId, partnerId),
          eq(messages.read, false)
        )
      );
  } else {
    // Partner is a human - get messages in both directions
    threadMessages = await db
      .select({
        id: messages.id,
        senderType: messages.senderType,
        senderClerkUserId: messages.senderClerkUserId,
        senderAgentId: messages.senderAgentId,
        content: messages.content,
        read: messages.read,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        and(
          eq(messages.senderType, "human"),
          or(
            and(
              eq(messages.senderClerkUserId, userId),
              eq(messages.recipientClerkUserId, partnerId)
            ),
            and(
              eq(messages.senderClerkUserId, partnerId),
              eq(messages.recipientClerkUserId, userId)
            )
          )
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(100);

    // Mark unread messages from this partner as read
    await db
      .update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.senderType, "human"),
          eq(messages.senderClerkUserId, partnerId),
          eq(messages.recipientClerkUserId, userId),
          eq(messages.read, false)
        )
      );
  }

  // Enrich agent sender info
  const agentIds = [...new Set(
    threadMessages
      .filter((m) => m.senderAgentId)
      .map((m) => m.senderAgentId!)
  )];

  let agentMap: Record<string, { name: string; displayName: string | null; avatarUrl: string | null }> = {};
  if (agentIds.length > 0) {
    const agentRows = await db
      .select({
        id: agents.id,
        name: agents.name,
        displayName: agents.displayName,
        avatarUrl: agents.avatarUrl,
      })
      .from(agents)
      .where(sql`${agents.id} IN (${sql.join(agentIds.map(id => sql`${id}::uuid`), sql`, `)})`);

    for (const a of agentRows) {
      agentMap[a.id] = { name: a.name, displayName: a.displayName, avatarUrl: a.avatarUrl };
    }
  }

  const data = threadMessages.map((m) => ({
    ...m,
    senderAgent: m.senderAgentId ? agentMap[m.senderAgentId] ?? null : null,
  }));

  return json({ data });
}
