import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const protectedRoutes = createRouteMatcher(["/admin(.*)", "/rider(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (protectedRoutes(req)) {
    const session = await auth();
    if (!session.userId) {
      return session.redirectToSignIn({ returnBackUrl: req.url });
    }

    // Role gating for admin areas. The role is stored in Clerk publicMetadata.
    const metadata = (session.sessionClaims?.publicMetadata ?? {}) as { role?: string };
    const role = metadata.role ?? "customer";

    if (isAdminRoute(req) && role !== "owner" && role !== "admin") {
      return NextResponse.redirect(new URL("/rider", req.url));
    }
    if (req.nextUrl.pathname.startsWith("/rider") && role === "rider") {
      return NextResponse.next();
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