import { NextRequest, NextResponse } from "next/server";
import { isValidSession } from "@/lib/auth-session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requiresAuth =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/campaigns") ||
    pathname.startsWith("/api/segments") ||
    pathname.startsWith("/api/backend");

  if (requiresAuth) {
    const session = request.cookies.get("admin_session")?.value;
    if (!isValidSession(session)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/campaigns/:path*",
    "/api/segments/:path*",
    "/api/backend/:path*",
  ],
};
