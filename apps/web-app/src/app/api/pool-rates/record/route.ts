import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { orchestrator } from "@/lib/orchestrator";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  if (process.env.KEEPER_BACKEND_ENABLED === "true") {
    return NextResponse.json(
      { skipped: "handled by NestJS backend cron" },
      { status: 200 }
    );
  }

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
    const pools = await orchestrator.getAllPools();

    const rows = pools
      .filter((p) => p.apy > 0 || (p.metadata?.borrowApy as number) > 0)
      .map((p) => ({
        pool_id: p.id,
        supply_apy: p.apy ?? 0,
        borrow_apy: (p.metadata?.borrowApy as number | undefined) ?? null,
      }));

    if (rows.length === 0) {
      return NextResponse.json({ inserted: 0 });
    }

    const { error } = await supabase.from("pool_rate_history").insert(rows);
    if (error) throw error;

    return NextResponse.json({ inserted: rows.length });
  } catch (err) {
    console.error("[pool-rates/record]", err);
    return NextResponse.json(
      { error: "Failed to record rates" },
      { status: 500 }
    );
  }
}
