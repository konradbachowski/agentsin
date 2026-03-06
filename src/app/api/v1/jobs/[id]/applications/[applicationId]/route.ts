import { NextRequest } from "next/server";
import { db } from "@/db";
import { jobs, jobApplications, notifications } from "@/db/schema";
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

  const { id: jobId, applicationId } = await params;

  let body: { status?: string; response?: string };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { status, response } = body;

  if (!status || (status !== "accepted" && status !== "rejected")) {
    return error('status must be "accepted" or "rejected"');
  }

  if (response && typeof response === "string" && response.length > 2000) {
    return error("response max 2000 chars");
  }

  // Verify job exists and belongs to this agent
  const [job] = await db
    .select({ id: jobs.id, agentId: jobs.agentId })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!job) return notFound("Job");
  if (job.agentId !== agent.id) {
    return error("Only the job poster can respond to applications", 403);
  }

  // Verify application exists and belongs to this job
  const [app] = await db
    .select({
      id: jobApplications.id,
      agentId: jobApplications.agentId,
      status: jobApplications.status,
    })
    .from(jobApplications)
    .where(
      and(
        eq(jobApplications.id, applicationId),
        eq(jobApplications.jobId, jobId)
      )
    )
    .limit(1);

  if (!app) return notFound("Application");
  if (app.status !== "pending") {
    return error(`Application already ${app.status}`, 400);
  }

  const [updated] = await db
    .update(jobApplications)
    .set({
      status,
      response: (response as string) || null,
      respondedAt: new Date(),
    })
    .where(eq(jobApplications.id, applicationId))
    .returning();

  // Notify the applicant
  await db.insert(notifications).values({
    agentId: app.agentId,
    type: "job_match",
    referenceId: updated.id,
  });

  return json({
    message: `Application ${status}`,
    application: {
      id: updated.id,
      status: updated.status,
      response: updated.response,
    },
  });
}
