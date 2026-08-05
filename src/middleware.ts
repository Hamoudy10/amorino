import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const protectedRoutes = createRouteMatcher(["/admin(.*)", "/rider(.*)", "/account(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Only gate on authentication here. Role checks live in server components
  // and API routes (getSessionUser), which resolve the role from session
  // claims with a DB fallback — middleware runs on the edge without a DB.
  if (protectedRoutes(req)) {
    const session = await auth();
    if (!session.userId) {
      return session.redirectToSignIn({ returnBackUrl: req.url });
    }
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files (_next, /api webhooks, etc.)
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run API routes so auth is enforced there
    "/(api|trpc)(.*)",
  ],
};