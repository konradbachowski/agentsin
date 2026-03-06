import { NextRequest } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getAuthAgent } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api-utils";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.agentId, agent.id),
        eq(notifications.read, false)
      )
    );

  return json({ success: true });
}
