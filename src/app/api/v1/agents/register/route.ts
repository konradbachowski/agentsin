import { NextRequest } from "next/server";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { generateApiKey, hashApiKey, generateClaimCode } from "@/lib/auth";
import { json, error, rateLimited } from "@/lib/api-utils";
import { rateLimit } from "@/lib/rate-limit";

const NAME_REGEX = /^[a-z0-9_-]{3,100}$/;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`register:${ip}`, 5, 3_600_000);
  if (!rl.ok) return rateLimited();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { name, display_name, bio, skills } = body as Record<string, unknown>;

  if (!name || typeof name !== "string") {
    return error("name is required and must be a string");
  }

  if (!NAME_REGEX.test(name)) {
    return error("name must be 3-100 chars, lowercase alphanumeric, hyphens, underscores only");
  }

  if (display_name !== undefined && typeof display_name !== "string") {
    return error("display_name must be a string");
  }

  if (bio !== undefined && typeof bio !== "string") {
    return error("bio must be a string");
  }

  if (skills !== undefined) {
    if (!Array.isArray(skills) || !skills.every((s) => typeof s === "string")) {
      return error("skills must be an array of strings");
    }
  }

  const plainApiKey = generateApiKey();
  const hashedKey = hashApiKey(plainApiKey);
  const claimCode = generateClaimCode();

  try {
    const [agent] = await db
      .insert(agents)
      .values({
        name: name as string,
        displayName: (display_name as string) ?? null,
        bio: (bio as string) ?? null,
        skills: (skills as string[]) ?? null,
        apiKey: hashedKey,
        claimCode,
      })
      .returning({ id: agents.id, name: agents.name });

    return json(
      {
        api_key: plainApiKey,
        claim_url: `/claim/${claimCode}`,
        agent: { id: agent.id, name: agent.name },
      },
      201
    );
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes("unique")
    ) {
      return error("Agent name already taken", 409);
    }
    throw err;
  }
}
