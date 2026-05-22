import { getSupabaseAdmin } from "@/lib/supabase";
import {
  type Strategy,
  type StrategyStatus,
  type StrategyType,
  type StrategyWithStats,
  isStrategyStatus,
  isStrategyType,
} from "@/lib/strategies-schema";

export {
  STRATEGY_TYPES,
  isStrategyStatus,
  isStrategyType,
  type Strategy,
  type StrategyStatus,
  type StrategyType,
  type StrategyWithStats,
} from "@/lib/strategies-schema";

const TYPE_SET_FALLBACK: StrategyType = "acquisition";
const STATUS_FALLBACK: StrategyStatus = "active";

function mapStrategyRow(row: Record<string, unknown>): Strategy | null {
  const id = typeof row.id === "string" ? row.id : null;
  if (!id) return null;

  const typeRaw = typeof row.type === "string" ? row.type : TYPE_SET_FALLBACK;
  const type: StrategyType = isStrategyType(typeRaw)
    ? typeRaw
    : TYPE_SET_FALLBACK;

  const statusRaw =
    typeof row.status === "string" ? row.status : STATUS_FALLBACK;
  const status: StrategyStatus = isStrategyStatus(statusRaw)
    ? statusRaw
    : STATUS_FALLBACK;

  const targetRaw = row.target_count;
  let target_count = 0;
  if (typeof targetRaw === "number" && Number.isFinite(targetRaw)) {
    target_count = Math.max(0, Math.floor(targetRaw));
  }

  const tvRaw = row.target_volume;
  let target_volume = 0;
  if (typeof tvRaw === "number" && Number.isFinite(tvRaw))
    target_volume = Math.max(0, tvRaw);
  else if (typeof tvRaw === "string" && Number.isFinite(Number(tvRaw)))
    target_volume = Math.max(0, Number(tvRaw));

  const completed_at =
    typeof row.completed_at === "string" ? row.completed_at : null;

  return {
    id,
    name: String(row.name ?? ""),
    description:
      row.description === null || row.description === undefined
        ? null
        : String(row.description),
    type,
    target_count,
    target_volume,
    status,
    assigned_to:
      row.assigned_to === null || row.assigned_to === undefined
        ? null
        : String(row.assigned_to),
    created_by:
      row.created_by === null || row.created_by === undefined
        ? null
        : String(row.created_by),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    completed_at,
  };
}

export async function listStrategies(): Promise<StrategyWithStats[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const [
    { data: stratRows, error: stratErr },
    { data: invRows, error: invErr },
  ] = await Promise.all([
    supabase.from("strategies").select("*").order("created_at", {
      ascending: false,
    }),
    supabase
      .from("invitations")
      .select("strategy_id, status, volume_moved")
      .not("strategy_id", "is", null)
      .limit(2000),
  ]);

  if (stratErr || !stratRows?.length) {
    const empty: StrategyWithStats[] = [];
    return empty;
  }

  type Agg = {
    total: number;
    pending: number;
    accepted: number;
    expired: number;
    volume_moved: number;
  };

  const byStrategy = new Map<string, Agg>();
  if (!invErr && invRows?.length) {
    for (const r of invRows as Record<string, unknown>[]) {
      const sid = typeof r.strategy_id === "string" ? r.strategy_id : null;
      if (!sid) continue;
      const st = typeof r.status === "string" ? r.status : "pending";
      let agg = byStrategy.get(sid);
      if (!agg) {
        agg = {
          total: 0,
          pending: 0,
          accepted: 0,
          expired: 0,
          volume_moved: 0,
        };
        byStrategy.set(sid, agg);
      }
      agg.total += 1;
      if (st === "pending") agg.pending += 1;
      else if (st === "accepted") {
        agg.accepted += 1;
        const vm = Number((r as Record<string, unknown>).volume_moved);
        if (r.status === "accepted" && Number.isFinite(vm))
          agg.volume_moved = (agg.volume_moved ?? 0) + vm;
      } else if (st === "expired") agg.expired += 1;
    }
  }

  const out: StrategyWithStats[] = [];
  for (const row of stratRows as Record<string, unknown>[]) {
    const base = mapStrategyRow(row);
    if (!base) continue;
    const agg = byStrategy.get(base.id) ?? {
      total: 0,
      pending: 0,
      accepted: 0,
      expired: 0,
      volume_moved: 0,
    };
    const acceptance_rate =
      agg.total === 0 ? 0 : Math.round((agg.accepted / agg.total) * 1000) / 10;

    out.push({
      ...base,
      total_invitations: agg.total,
      pending: agg.pending,
      accepted: agg.accepted,
      expired: agg.expired,
      acceptance_rate,
      total_volume_moved: agg.volume_moved ?? 0,
    });
  }

  return out;
}

export async function getStrategy(id: string): Promise<Strategy | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("strategies")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data || typeof data !== "object") return null;
  return mapStrategyRow(data as Record<string, unknown>);
}

export async function createStrategy(data: {
  name: string;
  description: string | null;
  type: StrategyType;
  target_count: number;
  target_volume: number;
  assigned_to: string | null;
  created_by: string;
  status?: StrategyStatus;
}): Promise<{ data: Strategy | null; error: string | null }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { data: null, error: "Supabase client unavailable" };

  const assigned =
    (data.assigned_to?.trim()?.length ?? 0) ? data.assigned_to!.trim() : null;
  const target = Number.isFinite(data.target_count)
    ? Math.max(0, Math.floor(data.target_count))
    : 0;

  const status =
    data.status !== undefined &&
    data.status !== null &&
    isStrategyStatus(data.status)
      ? data.status
      : STATUS_FALLBACK;

  const row = {
    name: data.name.trim(),
    description: data.description?.trim() ? data.description.trim() : null,
    type: data.type,
    target_count: target,
    target_volume: Math.max(
      0,
      Number.isFinite(data.target_volume) ? data.target_volume : 0
    ),
    assigned_to: assigned,
    created_by: data.created_by,
    status,
  };

  const { data: inserted, error } = await supabase
    .from("strategies")
    .insert(row)
    .select("*")
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!inserted || typeof inserted !== "object")
    return { data: null, error: "Insert returned no data" };
  return {
    data: mapStrategyRow(inserted as Record<string, unknown>),
    error: null,
  };
}

export async function updateStrategy(
  id: string,
  data: Partial<{
    name: string;
    description: string | null;
    type: StrategyType;
    target_count: number;
    target_volume: number;
    status: StrategyStatus;
    assigned_to: string | null;
    completed_at: string | null;
  }>
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.description !== undefined) {
    patch.description =
      data.description === null ? null : data.description.trim() || null;
  }
  if (data.type !== undefined) patch.type = data.type;
  if (data.target_count !== undefined) {
    patch.target_count =
      typeof data.target_count === "number" &&
      Number.isFinite(data.target_count)
        ? Math.max(0, Math.floor(data.target_count))
        : 0;
  }
  if (data.target_volume !== undefined) {
    patch.target_volume =
      typeof data.target_volume === "number" &&
      Number.isFinite(data.target_volume)
        ? Math.max(0, data.target_volume)
        : 0;
  }
  if (data.status !== undefined) patch.status = data.status;
  if (data.assigned_to !== undefined) {
    patch.assigned_to =
      (data.assigned_to?.trim()?.length ?? 0) ? data.assigned_to!.trim() : null;
  }
  if (data.completed_at !== undefined) {
    patch.completed_at = data.completed_at ?? null;
  }

  await supabase.from("strategies").update(patch).eq("id", id);
}

export async function deleteStrategy(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase.from("strategies").delete().eq("id", id);
}

export async function getStrategyStats(): Promise<{
  total: number;
  active: number;
  paused: number;
  completed: number;
}> {
  const supabase = getSupabaseAdmin();
  const zero = { total: 0, active: 0, paused: 0, completed: 0 };
  if (!supabase) return zero;

  const [total, active, paused, completed] = await Promise.all([
    supabase.from("strategies").select("*", { count: "exact", head: true }),
    supabase
      .from("strategies")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("strategies")
      .select("*", { count: "exact", head: true })
      .eq("status", "paused"),
    supabase
      .from("strategies")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
  ]);

  return {
    total: total.count ?? 0,
    active: active.count ?? 0,
    paused: paused.count ?? 0,
    completed: completed.count ?? 0,
  };
}
