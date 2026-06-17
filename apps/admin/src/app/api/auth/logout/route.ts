import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const url = new URL("/login", request.url);
  const res = NextResponse.redirect(url, 303);
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set("admin_session", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure,
  });
  res.cookies.set("admin_step1", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure,
  });
  return res;
}
