import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isValidSession } from "@/lib/auth-session";

/** Returns a 401 response if there is no valid admin session cookie, otherwise null */
export function requireAdminSession(request: NextRequest): NextResponse | null {
  const session = request.cookies.get("admin_session")?.value;
  if (!isValidSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
