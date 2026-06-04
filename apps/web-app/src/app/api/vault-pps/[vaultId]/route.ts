import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vaultId: string }> }
) {
  const { vaultId } = await params;
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("vault_pps_history")
    .select("pps, recorded_at")
    .eq("vault_id", vaultId)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true });

  if (error) {
    console.error("[vault-pps/[vaultId]]", error);
    return NextResponse.json(
      { error: "Failed to fetch vault PPS history" },
      { status: 500 }
    );
  }

  const series = data ?? [];
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  let apy7d: number | null = null;
  if (series.length > 0) {
    const ppsNow = Number(series[series.length - 1].pps);
    const pastRow = series.find((r) => r.recorded_at >= sevenDaysAgo);
    if (pastRow) {
      const ppsPast = Number(pastRow.pps);
      apy7d = ppsPast > 0 ? (ppsNow / ppsPast - 1) * (365 / 7) * 100 : null;
    }
  }

  return NextResponse.json({ data: series, apy7d });
}
