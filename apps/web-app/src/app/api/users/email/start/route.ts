import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAppOrigin } from "@/lib/config/app-origin";
import { dbNetwork, getSupabaseAdmin } from "@/lib/services/supabase.server";
import type { EmailStartRequest } from "@/lib/types/user.types";

const NETWORK = dbNetwork();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<EmailStartRequest>;
    const wallet = body.wallet_address?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!wallet) {
      return NextResponse.json({ error: "wallet_required" }, { status: 400 });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const auth = getAuthClient();
    if (!admin || !auth) {
      return NextResponse.json({ error: "not_configured" }, { status: 500 });
    }

    const { error: upsertError } = await admin.from("users").upsert(
      {
        wallet_address: wallet,
        network: NETWORK,
        email,
        email_verified_at: null,
      },
      { onConflict: "wallet_address" }
    );

    if (upsertError) {
      return NextResponse.json(
        { error: upsertError.message ?? "db_error" },
        { status: 500 }
      );
    }

    const origin = getAppOrigin(new URL(request.url).origin);
    const redirectTo = `${origin}/auth/email-confirmed?wallet=${encodeURIComponent(wallet)}`;
    const { error } = await auth.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
        data: { wallet_address: wallet },
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "send_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
