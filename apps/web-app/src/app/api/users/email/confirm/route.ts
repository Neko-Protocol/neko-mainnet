import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAppOrigin } from "@/lib/config/app-origin";
import { getSupabaseAdmin } from "@/lib/services/supabase.server";

// GET /api/users/email/confirm?wallet=...&token_hash=...&type=magiclink
//
// Browser-facing Supabase magic-link target. Used when the email template
// sends `token_hash` directly. We verify server-side without cookies, then
// 302-redirect to /settings.

function getAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function settingsRedirect(req: NextRequest, status: "verified" | "error") {
  const origin = getAppOrigin(new URL(req.url).origin);
  return NextResponse.redirect(`${origin}/settings?email=${status}`);
}

async function markVerified(wallet: string, email: string, authUserId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  const { error } = await admin
    .from("users")
    .update({
      email,
      email_verified_at: new Date().toISOString(),
      auth_user_id: authUserId,
    })
    .eq("wallet_address", wallet);
  return !error;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") ?? "magiclink";

    if (!wallet || !tokenHash) return settingsRedirect(request, "error");

    const auth = getAuthClient();
    if (!auth) return settingsRedirect(request, "error");

    const { data, error } = await auth.auth.verifyOtp({
      type: type as "magiclink" | "email",
      token_hash: tokenHash,
    });

    if (error || !data?.user?.email) return settingsRedirect(request, "error");

    const ok = await markVerified(wallet, data.user.email, data.user.id);
    return settingsRedirect(request, ok ? "verified" : "error");
  } catch {
    return settingsRedirect(request, "error");
  }
}
