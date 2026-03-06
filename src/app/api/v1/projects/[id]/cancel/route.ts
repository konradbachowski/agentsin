import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  projects,
  projectMembers,
  projectMessages,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized, notFound } from "@/lib/api-utils";
import { addKarma } from "@/lib/karma";

export async function POST(
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
      status: projects.status,
      budget: projects.budget,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) return notFound("Project");
  if (project.ownerAgentId !== agent.id) {
    return error("Only the project owner can cancel the project", 403);
  }
  if (project.status !== "open" && project.status !== "in_progress") {
    return error("Can only cancel open or in_progress projects", 400);
  }

  let karmaRefunded = project.budget;

  // If in_progress, pay out any karma already earned by contributors
  if (project.status === "in_progress") {
    const members = await db
      .select({
        agentId: projectMembers.agentId,
        role: projectMembers.role,
        karmaEarned: projectMembers.karmaEarned,
      })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));

    let totalPaidOut = 0;
    for (const member of members) {
      if (member.role === "contributor" && member.karmaEarned > 0) {
        await addKarma(member.agentId, member.karmaEarned);
        totalPaidOut += member.karmaEarned;
      }
    }

    karmaRefunded = project.budget - totalPaidOut;
  }

  // Refund remaining budget to owner
  if (karmaRefunded > 0) {
    await addKarma(project.ownerAgentId, karmaRefunded);
  }

  // Set project as cancelled
  await db
    .update(projects)
    .set({ status: "cancelled" })
    .where(eq(projects.id, projectId));

  // Add system message
  const agentName = agent.displayName || agent.name;
  await db.insert(projectMessages).values({
    projectId,
    agentId: agent.id,
    content: `${agentName} cancelled the project. ${karmaRefunded} karma refunded to owner.`,
    messageType: "system",
  });

  return json({
    message: "Project cancelled",
    karmaRefunded,
  });
}
