import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/services/supabase.server";
import type { RecommendedStrategyDto } from "@/features/simulator/types/recommended.types";
import type { DestinationType } from "@/features/simulator/types/simulator.types";

export const dynamic = "force-dynamic";

interface RecommendedStrategyRow {
  id: string;
  name: string;
  description: string | null;
  token_code: string;
  destination_kind: string;
  destination_id: string;
  stack_kind: string | null;
  stack_id: string | null;
  amount: number | string | null;
  snapshot_apy: number | string | null;
  position: number;
  is_active: boolean;
}

function asDestinationKind(value: string): DestinationType {
  if (value === "pool" || value === "vault" || value === "yield-token") {
    return value;
  }
  return "pool";
}

function numericToString(value: number | string | null): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function numericToNumber(value: number | string | null): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function mapRow(row: RecommendedStrategyRow): RecommendedStrategyDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    tokenCode: row.token_code,
    destinationKind: asDestinationKind(row.destination_kind),
    destinationId: row.destination_id,
    stackKind: row.stack_kind ? asDestinationKind(row.stack_kind) : null,
    stackId: row.stack_id,
    amount: numericToString(row.amount),
    snapshotApy: numericToNumber(row.snapshot_apy),
  };
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ strategies: [] as RecommendedStrategyDto[] });
  }

  const { data, error } = await supabase
    .from("recommended_strategies")
    .select(
      "id, name, description, token_code, destination_kind, destination_id, stack_kind, stack_id, amount, snapshot_apy, position, is_active"
    )
    .eq("is_active", true)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[strategies/recommended]", error);
    return NextResponse.json({ strategies: [] as RecommendedStrategyDto[] });
  }

  const strategies = ((data ?? []) as RecommendedStrategyRow[]).map(mapRow);
  return NextResponse.json({ strategies });
}
