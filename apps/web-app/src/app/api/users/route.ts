import { NextRequest, NextResponse } from "next/server";
import { dbNetwork, getSupabaseAdmin } from "@/lib/services/supabase.server";
import type {
  UserConnectEvent,
  UserPreferences,
  UserPublic,
} from "@/lib/types/user.types";

const NETWORK = dbNetwork();

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ ok: true });

    const body = (await request.json()) as Partial<UserConnectEvent>;
    const wallet = body.wallet_address?.trim();
    if (!wallet) return NextResponse.json({ ok: true });

    const provider = body.wallet_provider?.trim() || null;

    const { error: insertError } = await supabase.from("users").insert({
      wallet_address: wallet,
      wallet_provider: provider,
      network: NETWORK,
    });

    if (insertError) {
      const isDuplicate =
        insertError.code === "23505" ||
        /duplicate key/i.test(insertError.message ?? "");
      if (!isDuplicate) return NextResponse.json({ ok: true });

      if (provider) {
        await supabase
          .from("users")
          .update({ wallet_provider: provider })
          .eq("wallet_address", wallet)
          .is("wallet_provider", null);
      } else {
        await supabase
          .from("users")
          .update({ updated_at: new Date().toISOString() })
          .eq("wallet_address", wallet);
      }
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json(null);

    const wallet = new URL(request.url).searchParams.get("wallet")?.trim();
    if (!wallet) return NextResponse.json(null);

    const { data, error } = await supabase
      .from("users")
      .select(
        "wallet_address, wallet_provider, email, email_verified_at, created_at, preferences"
      )
      .eq("wallet_address", wallet)
      .maybeSingle();

    if (error || !data) return NextResponse.json(null);

    const user: UserPublic = {
      wallet_address: data.wallet_address,
      wallet_provider: data.wallet_provider ?? null,
      email: data.email ?? null,
      email_verified_at: data.email_verified_at ?? null,
      created_at: data.created_at,
      preferences: (data.preferences as UserPreferences) ?? {},
    };
    return NextResponse.json(user);
  } catch {
    return NextResponse.json(null);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ ok: true });

    const body = (await request.json()) as {
      wallet_address?: string;
      preferences?: Partial<UserPreferences>;
    };
    const wallet = body.wallet_address?.trim();
    const incoming = body.preferences;
    if (!wallet || !incoming) return NextResponse.json({ ok: true });

    // Fetch current preferences, merge, then write back.
    const { data } = await supabase
      .from("users")
      .select("preferences")
      .eq("wallet_address", wallet)
      .maybeSingle();

    const current = (data?.preferences as Record<string, unknown>) ?? {};
    const merged = { ...current, ...incoming };

    await supabase
      .from("users")
      .update({ preferences: merged })
      .eq("wallet_address", wallet);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
