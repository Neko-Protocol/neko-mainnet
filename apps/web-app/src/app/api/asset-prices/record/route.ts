import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import { stellarPriceService } from "@/lib/services/stellar-price.service";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  try {
    const assets = Object.values(getAssetsConfig());
    const pricedAssets = await Promise.all(
      assets.map(async (asset) => {
        const { price, source } = await stellarPriceService.getPriceWithSource(
          asset.code,
          asset.contract
        );
        return { symbol: asset.code, price, source };
      })
    );

    const rows = pricedAssets.filter((row) => row.price > 0);
    if (rows.length === 0) {
      return NextResponse.json({ inserted: 0 });
    }

    const { error } = await supabase.from("asset_price_history").insert(rows);
    if (error) throw error;

    return NextResponse.json({ inserted: rows.length });
  } catch (err) {
    console.error("[asset-prices/record]", err);
    return NextResponse.json(
      { error: "Failed to record asset prices" },
      { status: 500 }
    );
  }
}
