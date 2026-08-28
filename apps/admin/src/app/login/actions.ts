"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  backendClient,
  type BackendResult,
} from "@/lib/services/backend-client";

export interface AuthActionResult {
  ok: boolean;
  message: string;
}

interface VerifyCodeResult extends BackendResult {
  tokenHash?: string;
}

const REQUEST_CODE_MESSAGES: Record<string, string> = {
  not_authorized: "This email is not an authorized admin.",
  send_failed: "Couldn't send the code. Try again.",
};

const VERIFY_CODE_MESSAGES: Record<string, string> = {
  invalid_code: "Invalid or expired code.",
};

export async function requestCode(rawEmail: string): Promise<AuthActionResult> {
  const email = rawEmail.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const result = await backendClient.post("admin-auth/request-code", { email });

  if (!result.ok) {
    return {
      ok: false,
      message:
        (result.reason && REQUEST_CODE_MESSAGES[result.reason]) ??
        "Couldn't send the code. Try again.",
    };
  }

  return { ok: true, message: `We sent a code to ${email}.` };
}

export async function verifyCode(
  email: string,
  rawCode: string
): Promise<AuthActionResult> {
  const code = rawCode.trim();

  if (!code) {
    return { ok: false, message: "Enter the code from your email." };
  }

  const result = await backendClient.post<VerifyCodeResult>(
    "admin-auth/verify-code",
    { email, code }
  );

  if (!result.ok || !result.tokenHash) {
    return {
      ok: false,
      message:
        (result.reason && VERIFY_CODE_MESSAGES[result.reason]) ??
        "Invalid or expired code.",
    };
  }
  const tokenHash = result.tokenHash;

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });

  if (error) {
    return { ok: false, message: "Invalid or expired code." };
  }

  redirect("/analytics");
}
