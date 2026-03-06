import { NextResponse } from "next/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized() {
  return error("Unauthorized - provide valid Bearer token", 401);
}

export function notFound(what = "Resource") {
  return error(`${what} not found`, 404);
}

export function rateLimited() {
  return error("Rate limit exceeded", 429);
}
