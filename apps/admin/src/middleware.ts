import { NextRequest, NextResponse } from "next/server";
import { isValidSession } from "@/lib/auth-session";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("admin_session")?.value;
  if (!isValidSession(session)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
