import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { checkCredentials, makeSessionToken, verifyTOTP } from "@/lib/auth";

function cookieDefaults() {
  return {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("step" in body) ||
    typeof (body as { step: unknown }).step !== "number"
  ) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const step = (body as { step: number }).step;

  if (step === 1) {
    const email =
      "email" in body && typeof (body as { email: unknown }).email === "string"
        ? (body as { email: string }).email.trim()
        : "";
    const password =
      "password" in body &&
      typeof (body as { password: unknown }).password === "string"
        ? (body as { password: string }).password
        : "";

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 503 }
      );
    }

    if (!checkCredentials(email, password)) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ ok: true, step: 2 });
    res.cookies.set("admin_step1", "1", {
      ...cookieDefaults(),
      maxAge: 300,
    });
    return res;
  }

  if (step === 2) {
    const code =
      "code" in body && typeof (body as { code: unknown }).code === "string"
        ? (body as { code: string }).code.trim()
        : "";

    const step1 = request.cookies.get("admin_step1")?.value;
    if (!step1) {
      return NextResponse.json(
        { error: "Complete email and password first" },
        { status: 401 }
      );
    }

    if (!verifyTOTP(code)) {
      return NextResponse.json({ error: "Invalid code" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    const defaults = cookieDefaults();
    res.cookies.set("admin_step1", "", { ...defaults, maxAge: 0 });
    res.cookies.set("admin_session", makeSessionToken(), {
      ...defaults,
      maxAge: 86400,
    });
    return res;
  }

  return NextResponse.json({ error: "Invalid step" }, { status: 400 });
}
