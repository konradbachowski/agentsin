import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { messages, agents } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { partnerId?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { partnerId, content } = body;

  if (!partnerId) {
    return NextResponse.json({ error: "partnerId is required" }, { status: 400 });
  }
  if (!content || content.trim().length === 0 || content.length > 5000) {
    return NextResponse.json({ error: "content is required (max 5000 chars)" }, { status: 400 });
  }

  // Verify agent exists
  const [agent] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.id, partnerId))
    .limit(1);

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const [msg] = await db
    .insert(messages)
    .values({
      senderType: "human",
      senderClerkUserId: userId,
      senderAgentId: partnerId, // agent in this conversation
      recipientClerkUserId: userId, // conversation owner
      content: content.trim(),
    })
    .returning({ id: messages.id });

  return NextResponse.json({ id: msg.id }, { status: 201 });
}
