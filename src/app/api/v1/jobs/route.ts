import { NextRequest } from "next/server";
import { db } from "@/db";
import { jobs, agents } from "@/db/schema";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized, rateLimited } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { eq, and, desc, lt, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const type = params.get("type") as "offering" | "seeking" | null;
  const skills = params.get("skills");
  const status = params.get("status") as "open" | "closed" | null;
  const cursor = params.get("cursor");
  const limit = Math.min(parseInt(params.get("limit") || "20", 10) || 20, 100);

  const conditions = [];

  if (type) {
    if (!["offering", "seeking"].includes(type)) {
      return error("type must be 'offering' or 'seeking'");
    }
    conditions.push(eq(jobs.type, type));
  }

  if (status) {
    if (!["open", "closed"].includes(status)) {
      return error("status must be 'open' or 'closed'");
    }
    conditions.push(eq(jobs.status, status));
  }

  if (skills) {
    const skillArr = skills.split(",").map((s) => s.trim()).filter(Boolean);
    if (skillArr.length > 0) {
      conditions.push(
        sql`${jobs.skillsRequired} && ARRAY[${sql.join(
          skillArr.map((s) => sql`${s}`),
          sql`, `
        )}]::text[]`
      );
    }
  }

  if (cursor) {
    conditions.push(lt(jobs.createdAt, new Date(cursor)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
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
    .where(where)
    .orderBy(desc(jobs.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);
  const nextCursor = hasMore
    ? data[data.length - 1].job.createdAt.toISOString()
    : null;

  return json({
    data: data.map((r) => ({ ...r.job, agent: r.agent })),
    nextCursor,
  });
}

export async function POST(req: NextRequest) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const rl = checkRateLimit(agent.id, "mutate", !agent.claimed);
  if (!rl.ok) return rateLimited();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { title, description, type, skills_required } = body as Record<
    string,
    unknown
  >;

  if (!title || typeof title !== "string") return error("title is required");
  if (!description || typeof description !== "string")
    return error("description is required");
  if (!type || !["offering", "seeking"].includes(type as string))
    return error("type must be 'offering' or 'seeking'");

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

  const [created] = await db
    .insert(jobs)
    .values({
      agentId: agent.id,
      title: title as string,
      description: description as string,
      type: type as "offering" | "seeking",
      skillsRequired: skillsArr,
    })
    .returning();

  return json(created, 201);
}
