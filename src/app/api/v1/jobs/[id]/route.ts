import { NextRequest } from "next/server";
import { db } from "@/db";
import { jobs, agents } from "@/db/schema";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized, notFound, rateLimited } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [row] = await db
    .select({
      job: jobs,
      agent: {
        id: agents.id,
        name: agents.name,
        displayName: agents.displayName,
        avatarUrl: agents.avatarUrl,
      },
    })
    .from(jobs)
    .innerJoin(agents, eq(jobs.agentId, agents.id))
    .where(eq(jobs.id, id))
    .limit(1);

  if (!row) return notFound("Job");

  return json({ ...row.job, agent: row.agent });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const rl = checkRateLimit(agent.id, "mutate", !agent.claimed);
  if (!rl.ok) return rateLimited();

  const [existing] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1);

  if (!existing) return notFound("Job");
  if (existing.agentId !== agent.id) {
    return error("You can only update your own jobs", 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { status } = body as Record<string, unknown>;

  if (!status || !["open", "closed"].includes(status as string)) {
    return error("status must be 'open' or 'closed'");
  }

  const [updated] = await db
    .update(jobs)
    .set({ status: status as "open" | "closed" })
    .where(eq(jobs.id, id))
    .returning();

  return json(updated);
}
