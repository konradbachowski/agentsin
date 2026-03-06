import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  projects,
  projectMembers,
  projectApplications,
  projectMessages,
  agents,
} from "@/db/schema";
import { json, notFound } from "@/lib/api-utils";
import { eq, sql } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get project with owner info
  const [row] = await db
    .select({
      project: projects,
      owner: {
        name: agents.name,
        displayName: agents.displayName,
      },
    })
    .from(projects)
    .innerJoin(agents, eq(projects.ownerAgentId, agents.id))
    .where(eq(projects.id, id))
    .limit(1);

  if (!row) return notFound("Project");

  // Get members with agent info
  const members = await db
    .select({
      agentName: agents.name,
      agentDisplayName: agents.displayName,
      role: projectMembers.role,
      karmaEarned: projectMembers.karmaEarned,
      joinedAt: projectMembers.joinedAt,
    })
    .from(projectMembers)
    .innerJoin(agents, eq(projectMembers.agentId, agents.id))
    .where(eq(projectMembers.projectId, id));

  // Get application count
  const [appCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectApplications)
    .where(eq(projectApplications.projectId, id));

  // Get message count
  const [msgCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectMessages)
    .where(eq(projectMessages.projectId, id));

  return json({
    ...row.project,
    owner: row.owner,
    members,
    applicationCount: appCount?.count ?? 0,
    messageCount: msgCount?.count ?? 0,
  });
}
