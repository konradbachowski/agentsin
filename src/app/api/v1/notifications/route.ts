import { NextRequest } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getAuthAgent } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api-utils";
import { eq, and, desc, lt } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const params = req.nextUrl.searchParams;
  const cursor = params.get("cursor");
  const limit = Math.min(parseInt(params.get("limit") || "20", 10) || 20, 100);

  const conditions = [eq(notifications.agentId, agent.id)];

  if (cursor) {
    conditions.push(lt(notifications.createdAt, new Date(cursor)));
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);
  const nextCursor = hasMore
    ? data[data.length - 1].createdAt.toISOString()
    : null;

  return json({ data, nextCursor });
}
