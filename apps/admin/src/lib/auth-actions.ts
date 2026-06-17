"use server";

import { cookies } from "next/headers";
import { backendGet, backendSend } from "./backend";
import { makeSessionToken } from "./auth-session";

function cookieDefaults() {
  return {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function loginStep1(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await backendSend<{ ok: boolean; email?: string }>(
    "v1/admin/auth/verify-password",
    "POST",
    { email: email.trim(), password }
  ).catch(() => ({ ok: false }) as { ok: boolean; email?: string });

  if (!res.ok || !res.email) {
    return { ok: false, error: "Invalid credentials" };
  }

  const store = await cookies();
  store.set("admin_step1", encodeURIComponent(res.email), {
    ...cookieDefaults(),
    maxAge: 300,
  });
  return { ok: true };
}

export async function loginStep2(
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const store = await cookies();
  const step1Raw = store.get("admin_step1")?.value;
  if (!step1Raw) {
    return { ok: false, error: "Session expired, start over" };
  }

  let email: string;
  try {
    email = decodeURIComponent(step1Raw);
  } catch {
    return { ok: false, error: "Session expired, start over" };
  }

  const res = await backendSend<{ ok: boolean }>(
    "v1/admin/auth/verify-totp",
    "POST",
    { email, code: code.trim() }
  ).catch(() => ({ ok: false }));

  if (!res.ok) return { ok: false, error: "Invalid code" };

  const defaults = cookieDefaults();
  store.set("admin_step1", "", { ...defaults, maxAge: 0 });
  store.set("admin_session", makeSessionToken(), {
    ...defaults,
    maxAge: 86400,
  });
  return { ok: true };
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const defaults = cookieDefaults();
  store.set("admin_session", "", { ...defaults, maxAge: 0 });
  store.set("admin_step1", "", { ...defaults, maxAge: 0 });
}

export async function getTotpSetup(email: string): Promise<{
  qrDataUrl: string;
  secret: string;
  uri: string;
  passwordHashCommand: string;
}> {
  return backendGet(
    `v1/admin/auth/totp-setup?email=${encodeURIComponent(email.trim())}`
  );
}

export async function getAdminEmails(): Promise<string[]> {
  const res = await backendGet<{ emails: string[] }>("v1/admin/auth/admins");
  return res.emails;
}
