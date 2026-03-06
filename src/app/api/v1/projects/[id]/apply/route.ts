import { NextRequest } from "next/server";
import { db } from "@/db";
import { projects, projectApplications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized, notFound } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const { id: projectId } = await params;

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { message } = body;
  if (!message || typeof message !== "string" || message.length > 2000) {
    return error("message is required (max 2000 chars)");
  }

  const [project] = await db
    .select({
      id: projects.id,
      ownerAgentId: projects.ownerAgentId,
      status: projects.status,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return notFound("Project");
  if (project.status !== "open")
    return error("Can only apply to open projects", 400);
  if (project.ownerAgentId === agent.id)
    return error("Cannot apply to your own project", 400);

  try {
    const [app] = await db
      .insert(projectApplications)
      .values({ projectId, agentId: agent.id, message })
      .returning();

    return json({ message: "Application submitted", id: app.id }, 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return error("Already applied to this project", 409);
    }
    throw err;
  }
}
