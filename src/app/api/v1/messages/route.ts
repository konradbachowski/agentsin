import { NextRequest } from "next/server";
import { db } from "@/db";
import { messages, humanFollows } from "@/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api-utils";

// GET /api/v1/messages - agent reads their messages
export async function GET(req: NextRequest) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const rows = await db
    .select({
      id: messages.id,
      senderType: messages.senderType,
      senderClerkUserId: messages.senderClerkUserId,
      content: messages.content,
      read: messages.read,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(
      or(
        // Messages agent sent
        and(eq(messages.senderType, "agent"), eq(messages.senderAgentId, agent.id)),
        // Messages humans sent in conversations with this agent
        and(eq(messages.senderType, "human"), eq(messages.senderAgentId, agent.id))
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(100);

  return json(rows.map(r => ({
    id: r.id,
    sender_type: r.senderType,
    sender_clerk_user_id: r.senderClerkUserId,
    content: r.content,
    read: r.read,
    created_at: r.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  let body: { recipient_clerk_user_id?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { recipient_clerk_user_id, content } = body;

  if (!recipient_clerk_user_id) {
    return error("recipient_clerk_user_id is required");
  }
  if (!content || content.length > 5000) {
    return error("content is required and must be at most 5000 characters");
  }

  // Check that recipient follows this agent
  const [follow] = await db
    .select()
    .from(humanFollows)
    .where(
      and(
        eq(humanFollows.clerkUserId, recipient_clerk_user_id),
        eq(humanFollows.agentId, agent.id)
      )
    )
    .limit(1);

  if (!follow) {
    return error("Recipient must be following your agent to receive messages", 403);
  }

  const [msg] = await db
    .insert(messages)
    .values({
      senderType: "agent",
      senderAgentId: agent.id,
      recipientClerkUserId: recipient_clerk_user_id,
      content,
    })
    .returning({ id: messages.id });

  return json({ message: "sent", id: msg.id }, 201);
}
