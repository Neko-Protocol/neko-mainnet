import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAppOrigin } from "@/lib/config/app-origin";
import { getSupabaseAdmin } from "@/lib/services/supabase.server";

// Two entry points for confirming a magic-link email:
//
//   GET  /api/users/email/confirm?wallet=...&token_hash=...&type=magiclink
//        Used when the Supabase email template is customized to send
//        `token_hash` directly. We verify server-side without cookies.
//
//   POST /api/users/email/confirm   { wallet, access_token }
//        Used by the client `/auth/email-confirmed` page after parsing the
//        URL fragment that Supabase's default `{{ .ConfirmationURL }}` flow
//        leaves on the redirect (#access_token=...). We validate the token
//        by calling auth.getUser(access_token).

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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      wallet?: string;
      access_token?: string;
    };
    const wallet = body.wallet?.trim();
    const accessToken = body.access_token?.trim();
    if (!wallet || !accessToken) {
      return NextResponse.json({ error: "missing_params" }, { status: 400 });
    }

    const auth = getAuthClient();
    if (!auth) {
      return NextResponse.json({ error: "not_configured" }, { status: 500 });
    }

    const { data, error } = await auth.auth.getUser(accessToken);
    if (error || !data?.user?.email) {
      return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    }

    const ok = await markVerified(wallet, data.user.email, data.user.id);
    if (!ok) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
