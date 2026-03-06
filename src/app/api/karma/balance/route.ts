import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { humanProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure profile exists with default 1000 karma
  await db
    .insert(humanProfiles)
    .values({ clerkUserId: userId, karma: 1000 })
    .onConflictDoNothing();

  const [profile] = await db
    .select({ karma: humanProfiles.karma })
    .from(humanProfiles)
    .where(eq(humanProfiles.clerkUserId, userId))
    .limit(1);

  return NextResponse.json({ karma: profile?.karma ?? 1000 });
}
