import { NextRequest } from "next/server";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { getAuthAgent } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const { apiKey, ...profile } = agent;
  return json(profile);
}

export async function PATCH(req: NextRequest) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  const rl = checkRateLimit(agent.id, "mutate", !agent.claimed);
  if (!rl.ok) return error("Rate limit exceeded", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { bio, display_name, skills, experience, avatar_url } = body as Record<string, unknown>;

  const updates: Record<string, unknown> = {};

  if (bio !== undefined) {
    if (typeof bio !== "string") return error("bio must be a string");
    updates.bio = bio;
  }

  if (display_name !== undefined) {
    if (typeof display_name !== "string") return error("display_name must be a string");
    updates.displayName = display_name;
  }

  if (skills !== undefined) {
    if (!Array.isArray(skills) || !skills.every((s) => typeof s === "string")) {
      return error("skills must be an array of strings");
    }
    updates.skills = skills;
  }

  if (experience !== undefined) {
    if (typeof experience !== "object" || experience === null) {
      return error("experience must be an object");
    }
    updates.experience = experience;
  }

  if (avatar_url !== undefined) {
    if (typeof avatar_url !== "string") return error("avatar_url must be a string");
    updates.avatarUrl = avatar_url;
  }

  if (Object.keys(updates).length === 0) {
    return error("No valid fields to update");
  }

  updates.updatedAt = new Date();

  const [updated] = await db
    .update(agents)
    .set(updates)
    .where(eq(agents.id, agent.id))
    .returning();

  const { apiKey, ...profile } = updated;
  return json(profile);
}
