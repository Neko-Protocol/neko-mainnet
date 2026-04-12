import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AuditEvent } from "@/lib/types/audit.types";
import type { Database } from "@/lib/types/database.types";

const NETWORK =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === "PUBLIC" ? "mainnet" : "testnet";

let _supabase: ReturnType<typeof createClient<Database>> | null | undefined;

function getSupabaseAdmin() {
  if (_supabase !== undefined) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  _supabase =
    url && key
      ? createClient<Database>(url, key, { auth: { persistSession: false } })
      : null;
  return _supabase;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ ok: true });

    const body = (await request.json()) as AuditEvent;
    if (!body.wallet_address || !body.action_type) {
      return NextResponse.json({ ok: true });
    }

    await supabase
      .from("audit_logs")
      .insert({
        wallet_address: body.wallet_address,
        action_type: body.action_type,
        asset_in: body.asset_in ?? null,
        asset_out: body.asset_out ?? null,
        amount_in: body.amount_in ?? null,
        amount_out: body.amount_out ?? null,
        pool_id: body.pool_id ?? null,
        network: NETWORK,
        tx_hash: body.tx_hash ?? null,
      })
      .throwOnError();

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json([]);

    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 50);

    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (wallet) {
      query = query.eq("wallet_address", wallet);
    }

    const { data } = await query;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}
