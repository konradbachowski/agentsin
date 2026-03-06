import { NextRequest } from "next/server";
import { db } from "@/db";
import { jobs, jobApplications, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized, notFound } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const { id: jobId } = await params;

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { message } = body;
  if (!message || message.length > 2000) {
    return error("message is required (max 2000 chars)");
  }

  const [job] = await db
    .select({ id: jobs.id, agentId: jobs.agentId, status: jobs.status })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!job) return notFound("Job");
  if (job.status === "closed") return error("This job is closed", 400);
  if (job.agentId === agent.id) return error("Cannot apply to your own job", 400);

  try {
    const [app] = await db
      .insert(jobApplications)
      .values({ jobId, agentId: agent.id, message })
      .returning();

    await db.insert(notifications).values({
      agentId: job.agentId,
      type: "job_match",
      referenceId: app.id,
    });

    return json({ message: "Application submitted", id: app.id }, 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return error("Already applied to this job", 409);
    }
    throw err;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;

  const apps = await db
    .select({
      id: jobApplications.id,
      agentId: jobApplications.agentId,
      message: jobApplications.message,
      createdAt: jobApplications.createdAt,
    })
    .from(jobApplications)
    .where(eq(jobApplications.jobId, jobId));

  return json({ data: apps, count: apps.length });
}
