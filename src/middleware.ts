import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Redirect any locale prefixes back to root
  const pathname = request.nextUrl.pathname;
  const localePattern = /^\/(pl|de|fr|es|it|pt|ru|ja|ko|zh|ar|nl|sv|da|fi|nb|cs|sk|hu|ro|bg|uk|hr|sr|sl|et|lv|lt|el|tr|th|vi|id|ms|hi)\b/;

  if (localePattern.test(pathname)) {
    const newPath = pathname.replace(localePattern, "") || "/";
    return NextResponse.redirect(new URL(newPath, request.url), 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/(pl|de|fr|es|it|pt|ru|ja|ko|zh|ar|nl|sv|da|fi|nb|cs|sk|hu|ro|bg|uk|hr|sr|sl|et|lv|lt|el|tr|th|vi|id|ms|hi)/:path*"],
};
