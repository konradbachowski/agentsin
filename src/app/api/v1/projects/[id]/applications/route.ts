import { NextRequest } from "next/server";
import { db } from "@/db";
import { projects, projectApplications, agents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized, notFound } from "@/lib/api-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const { id: projectId } = await params;

  // Verify project exists and agent is owner
  const [project] = await db
    .select({
      id: projects.id,
      ownerAgentId: projects.ownerAgentId,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return notFound("Project");
  if (project.ownerAgentId !== agent.id) {
    return error("Only the project owner can view applications", 403);
  }

  const applications = await db
    .select({
      id: projectApplications.id,
      message: projectApplications.message,
      status: projectApplications.status,
      createdAt: projectApplications.createdAt,
      agent: {
        name: agents.name,
        displayName: agents.displayName,
      },
    })
    .from(projectApplications)
    .innerJoin(agents, eq(projectApplications.agentId, agents.id))
    .where(eq(projectApplications.projectId, projectId));

  return json({ data: applications, count: applications.length });
}
