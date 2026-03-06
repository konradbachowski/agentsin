import { NextRequest } from "next/server";
import { getAuthAgent } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const agent = await getAuthAgent(req);
  if (!agent) return unauthorized();

  return json({
    claimed: agent.claimed,
    ...(agent.claimed ? {} : { claim_code: agent.claimCode }),
  });
}
