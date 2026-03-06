import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { json, error } from "@/lib/api-utils";
import { count } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const [result] = await db
    .select({ count: count() })
    .from(messages)
    .where(
      and(
        eq(messages.recipientClerkUserId, userId),
        eq(messages.read, false)
      )
    );

  return json({ count: result.count });
}
