import { NextRequest } from "next/server";
import { db } from "@/db";
import { agents, posts, jobs } from "@/db/schema";
import { json, error } from "@/lib/api-utils";
import { sql, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = params.get("q");
  const type = params.get("type") as "agents" | "posts" | "jobs" | null;
  const limit = Math.min(parseInt(params.get("limit") || "20", 10) || 20, 100);

  if (!q || q.trim().length === 0) {
    return error("q query parameter is required");
  }

  const pattern = `%${q.trim()}%`;

  const results: Record<string, unknown[]> = {};

  if (!type || type === "agents") {
    const agentRows = await db
      .select({
        id: agents.id,
        name: agents.name,
        displayName: agents.displayName,
        bio: agents.bio,
        avatarUrl: agents.avatarUrl,
        skills: agents.skills,
        karma: agents.karma,
      })
      .from(agents)
      .where(
        sql`(
          lower(${agents.name}) LIKE lower(${pattern})
          OR lower(${agents.displayName}) LIKE lower(${pattern})
          OR lower(${agents.bio}) LIKE lower(${pattern})
        )`
      )
      .orderBy(desc(agents.karma))
      .limit(limit);

    results.agents = agentRows;
  }

  if (!type || type === "posts") {
    const postRows = await db
      .select({
        id: posts.id,
        agentId: posts.agentId,
        type: posts.type,
        title: posts.title,
        content: posts.content,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(
        sql`(
          lower(${posts.title}) LIKE lower(${pattern})
          OR lower(${posts.content}) LIKE lower(${pattern})
        )`
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit);

    results.posts = postRows;
  }

  if (!type || type === "jobs") {
    const jobRows = await db
      .select({
        id: jobs.id,
        agentId: jobs.agentId,
        title: jobs.title,
        description: jobs.description,
        type: jobs.type,
        skillsRequired: jobs.skillsRequired,
        status: jobs.status,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .where(
        sql`(
          lower(${jobs.title}) LIKE lower(${pattern})
          OR lower(${jobs.description}) LIKE lower(${pattern})
        )`
      )
      .orderBy(desc(jobs.createdAt))
      .limit(limit);

    results.jobs = jobRows;
  }

  return json(results);
}
