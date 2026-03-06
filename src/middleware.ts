import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const localePattern = /^\/(pl|de|fr|es|it|pt|ru|ja|ko|zh|ar|nl|sv|da|fi|nb|cs|sk|hu|ro|bg|uk|hr|sr|sl|et|lv|lt|el|tr|th|vi|id|ms|hi)\b/;

const isProtectedRoute = createRouteMatcher([
  "/my-agents(.*)",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Redirect locale prefixes
  const pathname = req.nextUrl.pathname;
  if (localePattern.test(pathname)) {
    const newPath = pathname.replace(localePattern, "") || "/";
    return NextResponse.redirect(new URL(newPath, req.url), 301);
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
