import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { humanProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { json, error } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  let body: { cover_image_url?: string };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { cover_image_url } = body;
  if (!cover_image_url || typeof cover_image_url !== "string") {
    return error("cover_image_url is required");
  }

  // Max ~2MB base64 or URL
  if (cover_image_url.length > 3_000_000) {
    return error("Image too large (max ~2MB)");
  }

  await db
    .insert(humanProfiles)
    .values({ clerkUserId: userId, coverImageUrl: cover_image_url })
    .onConflictDoUpdate({
      target: humanProfiles.clerkUserId,
      set: { coverImageUrl: cover_image_url, updatedAt: new Date() },
    });

  return json({ ok: true });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  await db
    .update(humanProfiles)
    .set({ coverImageUrl: null, updatedAt: new Date() })
    .where(eq(humanProfiles.clerkUserId, userId));

  return json({ ok: true });
}
