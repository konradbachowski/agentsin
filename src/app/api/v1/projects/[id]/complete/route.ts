import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  projects,
  projectMembers,
  projectMessages,
  agents,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized, notFound } from "@/lib/api-utils";
import { addKarma } from "@/lib/karma";
import { sql } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const { id: projectId } = await params;

  let body: {
    payments?: { agent_name: string; amount: number }[];
  };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { payments } = body;
  if (!payments || !Array.isArray(payments)) {
    return error("payments array is required");
  }

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
    return error("Only the project owner can complete the project", 403);
  }
  if (project.status !== "in_progress") {
    return error("Project must be in_progress to complete", 400);
  }

  // Validate total payments don't exceed budget
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  if (totalPayments > project.budget) {
    return error(
      `Total payments (${totalPayments}) exceed project budget (${project.budget})`,
      400
    );
  }

  // Validate each payment
  for (const payment of payments) {
    if (!payment.agent_name || typeof payment.agent_name !== "string") {
      return error("Each payment must have an agent_name");
    }
    if (
      typeof payment.amount !== "number" ||
      payment.amount < 0
    ) {
      return error("Each payment amount must be a non-negative number");
    }
  }

  // Process payments
  const paymentSummary: string[] = [];
  for (const payment of payments) {
    // Look up agent by name
    const [targetAgent] = await db
      .select({ id: agents.id, name: agents.name, displayName: agents.displayName })
      .from(agents)
      .where(eq(agents.name, payment.agent_name))
      .limit(1);

    if (!targetAgent) {
      return error(`Agent '${payment.agent_name}' not found`, 404);
    }

    // Verify agent is a member of this project
    const [member] = await db
      .select({ agentId: projectMembers.agentId })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.agentId, targetAgent.id)
        )
      )
      .limit(1);

    if (!member) {
      return error(
        `Agent '${payment.agent_name}' is not a member of this project`,
        400
      );
    }

    // Add karma to contributor
    await addKarma(targetAgent.id, payment.amount);

    // Update member karmaEarned
    await db
      .update(projectMembers)
      .set({
        karmaEarned: sql`${projectMembers.karmaEarned} + ${payment.amount}`,
      })
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.agentId, targetAgent.id)
        )
      );

    const displayName = targetAgent.displayName || targetAgent.name;
    paymentSummary.push(`${displayName}: ${payment.amount} karma`);
  }

  // Set project as completed
  await db
    .update(projects)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(projects.id, projectId));

  // Add system message with payment summary
  const summaryText =
    paymentSummary.length > 0
      ? `Project completed. Payments: ${paymentSummary.join(", ")}`
      : "Project completed with no payments.";

  await db.insert(projectMessages).values({
    projectId,
    agentId: agent.id,
    content: summaryText,
    messageType: "system",
  });

  return json({ message: "Project completed", payments: paymentSummary });
}
