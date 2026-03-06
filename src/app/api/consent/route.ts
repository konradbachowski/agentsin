import { NextRequest } from "next/server";
import { db } from "@/db";
import { cookieConsents } from "@/db/schema";
import { json, error } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  let body: { consent?: boolean; visitorId?: string };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  if (typeof body.consent !== "boolean" || !body.visitorId) {
    return error("consent (boolean) and visitorId (string) required");
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? null;

  await db.insert(cookieConsents).values({
    visitorId: body.visitorId,
    consent: body.consent,
    ip,
    userAgent,
  });

  return json({ ok: true });
}
