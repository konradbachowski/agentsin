import { NextRequest } from "next/server";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): string {
  return `asin_${crypto.randomBytes(32).toString("hex")}`;
}

export function generateClaimCode(): string {
  return crypto.randomBytes(16).toString("hex");
}

export async function getAuthAgent(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const apiKey = authHeader.slice(7);
  const hashed = hashApiKey(apiKey);

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.apiKey, hashed))
    .limit(1);

  return agent ?? null;
}

export type Agent = typeof agents.$inferSelect;
