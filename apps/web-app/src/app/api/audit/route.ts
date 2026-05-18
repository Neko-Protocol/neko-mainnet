import { NextRequest, NextResponse } from "next/server";
import { normalizeAuditAssetKey } from "@/lib/helpers/auditAssetAmounts";
import { stellarNetwork } from "@/lib/constants/network";
import { getSupabaseAdmin } from "@/lib/services/supabase.server";
import type { AuditEvent } from "@/lib/types/audit.types";

function auditDbNetwork(): "mainnet" | "testnet" {
  const envNet =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK?.trim().toUpperCase() ?? "";
  if (envNet === "MAINNET" || envNet === "PUBLIC") return "mainnet";
  if (stellarNetwork === "PUBLIC") return "mainnet";
  return "testnet";
}

const NETWORK = auditDbNetwork();

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

    const tokenAmountIn = body.token_amount_in ?? null;
    let amountInUsd: number | null = null;
    if (assetIn && tokenAmountIn != null && Number.isFinite(tokenAmountIn)) {
      const { data: priceRow } = await supabase
        .from("asset_price_history")
        .select("price")
        .eq("symbol", assetIn.toUpperCase())
        .order("recorded_at", { ascending: false })
        .limit(1)
        .single();
      if (priceRow?.price && priceRow.price > 0) {
        amountInUsd = tokenAmountIn * priceRow.price;
      }
    }
    if (
      amountInUsd == null &&
      assetOut &&
      body.amount_out != null &&
      Number.isFinite(body.amount_out)
    ) {
      const { data: priceRow } = await supabase
        .from("asset_price_history")
        .select("price")
        .eq("symbol", assetOut.toUpperCase())
        .order("recorded_at", { ascending: false })
        .limit(1)
        .single();
      if (priceRow?.price && priceRow.price > 0) {
        amountInUsd = body.amount_out * priceRow.price;
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from("audit_logs")
      .insert({
        wallet_address: body.wallet_address,
        action_type: body.action_type,
        asset_in: assetIn,
        asset_out: assetOut,
        amount_in: amountInUsd,
        token_amount_in: tokenAmountIn,
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
      bumpLeg(assetIn, amountInUsd),
      bumpLeg(assetOut, body.amount_out),
    ]);

    let isFirstVaultDeposit: boolean | undefined;
    if (body.action_type === "vaults_deposit") {
      const { count } = await supabase
        .from("audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("wallet_address", body.wallet_address)
        .eq("action_type", "vaults_deposit");
      isFirstVaultDeposit = count === 1;
    }

    return NextResponse.json(
      { ok: true, isFirstVaultDeposit },
      { status: 201 }
    );
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
