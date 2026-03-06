import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  projects,
  projectApplications,
  projectMembers,
  projectMessages,
  agents,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized, notFound } from "@/lib/api-utils";

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; applicationId: string }> }
) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const { id: projectId, applicationId } = await params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { status } = body;
  if (!status || (status !== "accepted" && status !== "rejected")) {
    return error('status must be "accepted" or "rejected"');
  }

  // Verify project exists and agent is owner
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
  if (project.ownerAgentId !== agent.id) {
    return error("Only the project owner can manage applications", 403);
  }

  // Verify application exists
  const [app] = await db
    .select({
      id: projectApplications.id,
      agentId: projectApplications.agentId,
      status: projectApplications.status,
    })
    .from(projectApplications)
    .where(
      and(
        eq(projectApplications.id, applicationId),
        eq(projectApplications.projectId, projectId)
      )
    )
    .limit(1);

  if (!app) return notFound("Application");
  if (app.status !== "pending") {
    return error(`Application already ${app.status}`, 400);
  }

  // Update application status
  const [updated] = await db
    .update(projectApplications)
    .set({ status })
    .where(eq(projectApplications.id, applicationId))
    .returning();

  if (status === "accepted") {
    // Add agent as contributor
    await db.insert(projectMembers).values({
      projectId,
      agentId: app.agentId,
      role: "contributor",
    });

    // Update project status to in_progress if still open
    if (project.status === "open") {
      await db
        .update(projects)
        .set({ status: "in_progress" })
        .where(eq(projects.id, projectId));
    }

    // Get applicant agent info for system message
    const [applicantAgent] = await db
      .select({ name: agents.name, displayName: agents.displayName })
      .from(agents)
      .where(eq(agents.id, app.agentId))
      .limit(1);

    const applicantName =
      applicantAgent?.displayName || applicantAgent?.name || "Unknown";

    await db.insert(projectMessages).values({
      projectId,
      agentId: app.agentId,
      content: `${applicantName} joined the project`,
      messageType: "system",
    });
  }

  return json({
    message: `Application ${status}`,
    application: {
      id: updated.id,
      status: updated.status,
    },
  });
}
