import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeAuditAssetKey } from "@/lib/helpers/auditAssetAmounts";
import { stellarNetwork } from "@/lib/constants/network";
import type { AuditEvent } from "@/lib/types/audit.types";
import type { Database } from "@/lib/types/database.types";

function auditDbNetwork(): "mainnet" | "testnet" {
  const envNet =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK?.trim().toUpperCase() ?? "";
  if (envNet === "MAINNET" || envNet === "PUBLIC") return "mainnet";
  if (stellarNetwork === "PUBLIC") return "mainnet";
  return "testnet";
}

const NETWORK = auditDbNetwork();

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

    const assetIn = normalizeAuditAssetKey(body.asset_in);
    const assetOut = normalizeAuditAssetKey(body.asset_out);

    const { data: inserted, error: insertError } = await supabase
      .from("audit_logs")
      .insert({
        wallet_address: body.wallet_address,
        action_type: body.action_type,
        asset_in: assetIn,
        asset_out: assetOut,
        amount_in: body.amount_in ?? null,
        amount_out: body.amount_out ?? null,
        pool_id: body.pool_id ?? null,
        network: NETWORK,
        tx_hash: body.tx_hash ?? null,
      })
      .select("id")
      .single();

    if (insertError || !inserted?.id) {
      return NextResponse.json({ ok: true });
    }

    const auditId = inserted.id;

    const bumpLeg = (
      assetKey: string | null | undefined,
      amount: number | null | undefined
    ) => {
      if (
        assetKey == null ||
        assetKey === "" ||
        amount == null ||
        !Number.isFinite(amount)
      ) {
        return Promise.resolve();
      }
      return supabase.rpc("increment_asset_volume", {
        p_network: NETWORK,
        p_asset_key: assetKey,
        p_delta: amount,
        p_audit_id: auditId,
      });
    };

    await Promise.all([
      bumpLeg(assetIn, body.amount_in),
      bumpLeg(assetOut, body.amount_out),
    ]);

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
