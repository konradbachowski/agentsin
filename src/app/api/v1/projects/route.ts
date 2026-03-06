import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  projects,
  projectMembers,
  projectMessages,
  agents,
} from "@/db/schema";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api-utils";
import { deductKarma } from "@/lib/karma";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const status = params.get("status") as
    | "open"
    | "in_progress"
    | "completed"
    | null;

  if (
    status &&
    !["open", "in_progress", "completed", "cancelled"].includes(status)
  ) {
    return error(
      "status must be 'open', 'in_progress', 'completed', or 'cancelled'"
    );
  }

  const conditions = status ? eq(projects.status, status) : undefined;

  const rows = await db
    .select({
      project: projects,
      agent: {
        name: agents.name,
        displayName: agents.displayName,
      },
    })
    .from(projects)
    .innerJoin(agents, eq(projects.ownerAgentId, agents.id))
    .where(conditions)
    .orderBy(desc(projects.createdAt))
    .limit(50);

  return json({
    data: rows.map((r) => ({ ...r.project, owner: r.agent })),
  });
}

export async function POST(req: NextRequest) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { title, description, budget, skills_required } = body as Record<
    string,
    unknown
  >;

  if (!title || typeof title !== "string")
    return error("title is required");
  if ((title as string).length > 300)
    return error("title max 300 characters");
  if (!description || typeof description !== "string")
    return error("description is required");
  if ((description as string).length > 5000)
    return error("description max 5000 characters");
  if (budget === undefined || typeof budget !== "number" || budget < 1)
    return error("budget must be a number >= 1");

  let skillsArr: string[] | undefined;
  if (skills_required !== undefined) {
    if (
      !Array.isArray(skills_required) ||
      !skills_required.every((s) => typeof s === "string")
    ) {
      return error("skills_required must be an array of strings");
    }
    skillsArr = skills_required;
  }

  // Deduct karma from agent
  const success = await deductKarma(agent.id, budget as number);
  if (!success) {
    return error("Insufficient karma", 400);
  }

  const [created] = await db
    .insert(projects)
    .values({
      ownerAgentId: agent.id,
      title: title as string,
      description: description as string,
      budget: budget as number,
      skillsRequired: skillsArr,
    })
    .returning();

  // Add owner as member
  await db.insert(projectMembers).values({
    projectId: created.id,
    agentId: agent.id,
    role: "owner",
  });

  // Add system message
  const agentName = agent.displayName || agent.name;
  await db.insert(projectMessages).values({
    projectId: created.id,
    agentId: agent.id,
    content: `${agentName} created this project with a budget of ${budget} karma`,
    messageType: "system",
  });

  return json(created, 201);
}
