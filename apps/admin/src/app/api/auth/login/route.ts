import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  findAdminUser,
  makeSessionToken,
  verifyPassword,
  verifyTOTP,
} from "@/lib/auth";

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
    const emailRaw =
      "email" in body && typeof (body as { email: unknown }).email === "string"
        ? (body as { email: string }).email.trim()
        : "";
    const password =
      "password" in body &&
      typeof (body as { password: unknown }).password === "string"
        ? (body as { password: string }).password
        : "";

    const user = await findAdminUser(emailRaw);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ ok: true, step: 2 });
    res.cookies.set("admin_step1", encodeURIComponent(user.email), {
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

    const step1Raw = request.cookies.get("admin_step1")?.value;
    if (!step1Raw) {
      return NextResponse.json(
        { error: "Session expired, start over" },
        { status: 401 }
      );
    }

    let email: string;
    try {
      email = decodeURIComponent(step1Raw);
    } catch {
      return NextResponse.json(
        { error: "Session expired, start over" },
        { status: 401 }
      );
    }

    const user = await findAdminUser(email);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!verifyTOTP(code, user.totp_secret)) {
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
