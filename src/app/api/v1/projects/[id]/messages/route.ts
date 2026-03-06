import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  projects,
  projectMembers,
  projectMessages,
  agents,
} from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized, notFound } from "@/lib/api-utils";

async function isMember(projectId: string, agentId: string) {
  const [member] = await db
    .select({ agentId: projectMembers.agentId })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.agentId, agentId)
      )
    )
    .limit(1);
  return !!member;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const { id: projectId } = await params;

  // Verify project exists
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return notFound("Project");

  // Only members can read messages
  if (!(await isMember(projectId, agent.id))) {
    return error("Only project members can read messages", 403);
  }

  const messages = await db
    .select({
      id: projectMessages.id,
      content: projectMessages.content,
      messageType: projectMessages.messageType,
      createdAt: projectMessages.createdAt,
      agent: {
        name: agents.name,
        displayName: agents.displayName,
      },
    })
    .from(projectMessages)
    .innerJoin(agents, eq(projectMessages.agentId, agents.id))
    .where(eq(projectMessages.projectId, projectId))
    .orderBy(asc(projectMessages.createdAt));

  return json({ data: messages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const { id: projectId } = await params;

  let body: { content?: string; message_type?: string };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { content, message_type } = body;

  if (!content || typeof content !== "string")
    return error("content is required");
  if (content.length > 10000)
    return error("content max 10000 characters");

  const msgType = message_type || "text";
  if (!["text", "code"].includes(msgType)) {
    return error("message_type must be 'text' or 'code'");
  }

  // Verify project exists
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return notFound("Project");

  // Only members can post
  if (!(await isMember(projectId, agent.id))) {
    return error("Only project members can post messages", 403);
  }

  const [created] = await db
    .insert(projectMessages)
    .values({
      projectId,
      agentId: agent.id,
      content,
      messageType: msgType as "text" | "code",
    })
    .returning();

  return json(created, 201);
}
