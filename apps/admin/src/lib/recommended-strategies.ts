import { getSupabaseAdmin } from "@/lib/supabase";
import {
  type CatalogDestination,
  type DestinationKind,
  type RecommendedStrategy,
  isDestinationKind,
} from "@/lib/recommended-strategies-schema";

export {
  decodeDestinationValue,
  encodeDestinationValue,
  isDestinationKind,
  type CatalogDestination,
  type DestinationKind,
  type RecommendedStrategy,
} from "@/lib/recommended-strategies-schema";

function parseNullableNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim().length > 0) {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseIntNumber(raw: unknown, fallback = 0): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.floor(raw);
  }
  if (typeof raw === "string" && Number.isFinite(Number(raw))) {
    return Math.floor(Number(raw));
  }
  return fallback;
}

function mapRecommendedStrategyRow(
  row: Record<string, unknown>
): RecommendedStrategy | null {
  const id = typeof row.id === "string" ? row.id : null;
  if (!id) return null;

  const destKindRaw =
    typeof row.destination_kind === "string" ? row.destination_kind : "";
  const destination_kind: DestinationKind = isDestinationKind(destKindRaw)
    ? destKindRaw
    : "pool";

  let stack_kind: DestinationKind | null = null;
  if (row.stack_kind !== null && row.stack_kind !== undefined) {
    const sk = typeof row.stack_kind === "string" ? row.stack_kind : "";
    stack_kind = isDestinationKind(sk) ? sk : null;
  }

  const is_active = typeof row.is_active === "boolean" ? row.is_active : true;

  return {
    id,
    name: String(row.name ?? ""),
    description:
      row.description === null || row.description === undefined
        ? null
        : String(row.description),
    token_code: String(row.token_code ?? ""),
    destination_kind,
    destination_id: String(row.destination_id ?? ""),
    stack_kind,
    stack_id:
      row.stack_id === null || row.stack_id === undefined
        ? null
        : String(row.stack_id),
    amount: parseNullableNumber(row.amount),
    snapshot_apy: parseNullableNumber(row.snapshot_apy),
    position: parseIntNumber(row.position, 0),
    is_active,
    created_by:
      row.created_by === null || row.created_by === undefined
        ? null
        : String(row.created_by),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function listCatalogDestinations(): Promise<CatalogDestination[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("destination_catalog")
    .select("kind, id, name, protocol, apy, accepted_token_codes")
    .order("name", { ascending: true });

  if (error || !data?.length) return [];

  const out: CatalogDestination[] = [];
  for (const row of data as Record<string, unknown>[]) {
    const kindRaw = typeof row.kind === "string" ? row.kind : "";
    if (!isDestinationKind(kindRaw)) continue;

    const id = typeof row.id === "string" ? row.id : "";
    if (!id) continue;

    const acceptedTokenCodes = Array.isArray(row.accepted_token_codes)
      ? row.accepted_token_codes.filter(
          (code): code is string => typeof code === "string"
        )
      : [];

    out.push({
      kind: kindRaw,
      id,
      name: String(row.name ?? ""),
      protocol: String(row.protocol ?? ""),
      apy: parseNullableNumber(row.apy),
      acceptedTokenCodes,
    });
  }
  return out;
}

export async function listRecommendedStrategies(): Promise<
  RecommendedStrategy[]
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("recommended_strategies")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data?.length) return [];

  const out: RecommendedStrategy[] = [];
  for (const row of data as Record<string, unknown>[]) {
    const mapped = mapRecommendedStrategyRow(row);
    if (mapped) out.push(mapped);
  }
  return out;
}

export async function getRecommendedStrategy(
  id: string
): Promise<RecommendedStrategy | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("recommended_strategies")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data || typeof data !== "object") return null;
  return mapRecommendedStrategyRow(data as Record<string, unknown>);
}

export async function createRecommendedStrategy(data: {
  name: string;
  description: string | null;
  token_code: string;
  destination_kind: DestinationKind;
  destination_id: string;
  stack_kind: DestinationKind | null;
  stack_id: string | null;
  amount: number | null;
  snapshot_apy: number | null;
  position: number;
  is_active: boolean;
  created_by: string;
}): Promise<{ data: RecommendedStrategy | null; error: string | null }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { data: null, error: "Supabase client unavailable" };

  const row = {
    name: data.name.trim(),
    description: data.description?.trim() ? data.description.trim() : null,
    token_code: data.token_code.trim(),
    destination_kind: data.destination_kind,
    destination_id: data.destination_id.trim(),
    stack_kind: data.stack_kind,
    stack_id: data.stack_id?.trim() ? data.stack_id.trim() : null,
    amount: data.amount,
    snapshot_apy: data.snapshot_apy,
    position: Math.max(0, Math.floor(data.position)),
    is_active: data.is_active,
    created_by: data.created_by,
  };

  const { data: inserted, error } = await supabase
    .from("recommended_strategies")
    .insert(row)
    .select("*")
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!inserted || typeof inserted !== "object") {
    return { data: null, error: "Insert returned no data" };
  }
  return {
    data: mapRecommendedStrategyRow(inserted as Record<string, unknown>),
    error: null,
  };
}

export async function updateRecommendedStrategy(
  id: string,
  data: Partial<{
    name: string;
    description: string | null;
    token_code: string;
    destination_kind: DestinationKind;
    destination_id: string;
    stack_kind: DestinationKind | null;
    stack_id: string | null;
    amount: number | null;
    snapshot_apy: number | null;
    position: number;
    is_active: boolean;
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
  if (data.token_code !== undefined) patch.token_code = data.token_code.trim();
  if (data.destination_kind !== undefined) {
    patch.destination_kind = data.destination_kind;
  }
  if (data.destination_id !== undefined) {
    patch.destination_id = data.destination_id.trim();
  }
  if (data.stack_kind !== undefined) patch.stack_kind = data.stack_kind;
  if (data.stack_id !== undefined) {
    patch.stack_id =
      data.stack_id === null ? null : data.stack_id.trim() || null;
  }
  if (data.amount !== undefined) patch.amount = data.amount;
  if (data.snapshot_apy !== undefined) patch.snapshot_apy = data.snapshot_apy;
  if (data.position !== undefined) {
    patch.position =
      typeof data.position === "number" && Number.isFinite(data.position)
        ? Math.max(0, Math.floor(data.position))
        : 0;
  }
  if (data.is_active !== undefined) patch.is_active = data.is_active;

  await supabase.from("recommended_strategies").update(patch).eq("id", id);
}

export async function deleteRecommendedStrategy(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase.from("recommended_strategies").delete().eq("id", id);
}
