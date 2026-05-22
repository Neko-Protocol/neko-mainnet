import { getSupabaseAdmin } from "@/lib/supabase";
import {
  INVITATION_TYPES,
  type Invitation,
  type InvitationType,
  type InvitationStatus,
} from "@/lib/invitations-schema";

export {
  INVITATION_TYPES,
  isInvitationType,
  type Invitation,
  type InvitationType,
  type InvitationStatus,
} from "@/lib/invitations-schema";

const STATUS_SET = new Set<InvitationStatus>([
  "pending",
  "accepted",
  "expired",
]);

const TYPE_SET = new Set<string>(INVITATION_TYPES.map((t) => t.id));

function mapRow(row: Record<string, unknown>): Invitation | null {
  const id = typeof row.id === "string" ? row.id : null;
  if (!id) return null;

  let typeRaw = typeof row.type === "string" ? row.type : "user";
  if (!TYPE_SET.has(typeRaw)) typeRaw = "user";
  const type = typeRaw as InvitationType;

  const statusRaw = typeof row.status === "string" ? row.status : "pending";
  const status: InvitationStatus = STATUS_SET.has(statusRaw as InvitationStatus)
    ? (statusRaw as InvitationStatus)
    : "pending";

  const strategyIdRaw = row.strategy_id;
  const strategy_id =
    strategyIdRaw === null || strategyIdRaw === undefined
      ? null
      : typeof strategyIdRaw === "string"
        ? strategyIdRaw
        : String(strategyIdRaw);

  return {
    id,
    email: String(row.email ?? ""),
    type,
    token: String(row.token ?? ""),
    status,
    assigned_to:
      row.assigned_to === null || row.assigned_to === undefined
        ? null
        : String(row.assigned_to),
    notes:
      row.notes === null || row.notes === undefined ? null : String(row.notes),
    created_by:
      row.created_by === null || row.created_by === undefined
        ? null
        : String(row.created_by),
    strategy_id,
    accepted_at: typeof row.accepted_at === "string" ? row.accepted_at : null,
    accepted_notes:
      row.accepted_notes === null || row.accepted_notes === undefined
        ? null
        : String(row.accepted_notes),
    volume_moved:
      row.volume_moved !== null &&
      row.volume_moved !== undefined &&
      Number.isFinite(Number(row.volume_moved))
        ? Number(row.volume_moved)
        : null,
    expires_at: String(row.expires_at ?? ""),
    created_at: String(row.created_at ?? ""),
  };
}

export async function acceptInvitation(
  id: string,
  data: { accepted_notes: string | null; volume_moved: number | null }
): Promise<Invitation | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: updated, error } = await supabase
    .from("invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_notes: data.accepted_notes?.trim() || null,
      volume_moved: data.volume_moved ?? null,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !updated) return null;
  return mapRow(updated as Record<string, unknown>);
}

export async function listInvitations(filters?: {
  status?: string;
  type?: string;
  assigned_to?: string;
  strategy_id?: string;
}): Promise<Invitation[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  let q = supabase
    .from("invitations")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.strategy_id !== undefined && filters.strategy_id.length > 0) {
    q = q.eq("strategy_id", filters.strategy_id);
  }

  if (filters?.status && STATUS_SET.has(filters.status as InvitationStatus)) {
    q = q.eq("status", filters.status);
  }

  if (filters?.type && TYPE_SET.has(filters.type)) {
    q = q.eq("type", filters.type);
  }

  if (filters?.assigned_to !== undefined && filters.assigned_to.length > 0) {
    q = q.eq("assigned_to", filters.assigned_to);
  }

  const { data, error } = await q.limit(500);

  if (error || !data?.length) return [];

  const out: Invitation[] = [];
  for (const r of data as Record<string, unknown>[]) {
    const inv = mapRow(r);
    if (inv) out.push(inv);
  }
  return out;
}

export async function createInvitation(data: {
  email: string;
  type: InvitationType;
  assigned_to: string | null;
  notes: string | null;
  created_by: string;
  expires_days: number;
  strategy_id: string | null;
}): Promise<Invitation | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const expiresAt = new Date(
    Date.now() + Math.max(1, Math.floor(data.expires_days)) * 86_400_000
  ).toISOString();

  const assigned =
    (data.assigned_to?.trim()?.length ?? 0) ? data.assigned_to!.trim() : null;

  const strat =
    (data.strategy_id?.trim()?.length ?? 0) ? data.strategy_id!.trim() : null;

  const { data: inserted, error } = await supabase
    .from("invitations")
    .insert({
      email: data.email.trim().toLowerCase(),
      type: data.type,
      assigned_to: assigned,
      notes: data.notes?.trim() || null,
      created_by: data.created_by,
      expires_at: expiresAt,
      strategy_id: strat,
    })
    .select("*")
    .maybeSingle();

  if (error || !inserted || typeof inserted !== "object") return null;
  return mapRow(inserted as Record<string, unknown>);
}

export async function getAdminUsers(): Promise<{ email: string }[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("admin_users")
    .select("email")
    .eq("is_active", true)
    .order("email", { ascending: true });

  if (error || !data?.length) return [];

  return (data as { email?: string }[])
    .map((r) => ({ email: String(r.email ?? "") }))
    .filter((r) => r.email.length > 0);
}

export async function markExpired(): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const now = new Date().toISOString();
  await supabase
    .from("invitations")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("expires_at", now);
}

export async function deleteInvitation(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase.from("invitations").delete().eq("id", id);
}

export async function getInvitationStats(): Promise<{
  total: number;
  pending: number;
  accepted: number;
  expired: number;
}> {
  const supabase = getSupabaseAdmin();
  const empty = { total: 0, pending: 0, accepted: 0, expired: 0 };
  if (!supabase) return empty;

  const [total, pending, accepted, expired] = await Promise.all([
    supabase.from("invitations").select("*", { count: "exact", head: true }),
    supabase
      .from("invitations")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("invitations")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted"),
    supabase
      .from("invitations")
      .select("*", { count: "exact", head: true })
      .eq("status", "expired"),
  ]);

  return {
    total: total.count ?? 0,
    pending: pending.count ?? 0,
    accepted: accepted.count ?? 0,
    expired: expired.count ?? 0,
  };
}
