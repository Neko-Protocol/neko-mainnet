import { getSupabaseAdmin } from "@/lib/supabase";
import type { CampaignDTO } from "@/types/campaign";

export type Campaign = CampaignDTO;

function mapRow(row: Record<string, unknown>): Campaign | null {
  const id = typeof row.id === "string" ? row.id : null;
  if (!id) return null;
  const status = row.status as Campaign["status"];
  const allowed: Campaign["status"][] = ["draft", "sending", "sent", "failed"];
  const safeStatus = allowed.includes(status) ? status : "draft";

  const rc = row.recipient_count;
  const recipient_count = rc === null || rc === undefined ? null : Number(rc);

  return {
    id,
    name: String(row.name ?? ""),
    subject: String(row.subject ?? ""),
    body_html: String(row.body_html ?? ""),
    segment: typeof row.segment === "string" ? row.segment : "all",
    status: safeStatus,
    recipient_count:
      recipient_count !== null && Number.isFinite(recipient_count)
        ? recipient_count
        : null,
    sent_at: typeof row.sent_at === "string" ? row.sent_at : null,
    created_at: String(row.created_at ?? ""),
    created_by: row.created_by == null ? null : String(row.created_by),
  };
}

export async function getCampaignStats(): Promise<{
  total: number;
  sent: number;
  draft: number;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { total: 0, sent: 0, draft: 0 };

  const [total, sent, draft] = await Promise.all([
    supabase.from("campaigns").select("*", { count: "exact", head: true }),
    supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent"),
    supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft"),
  ]);

  return {
    total: total.count ?? 0,
    sent: sent.count ?? 0,
    draft: draft.count ?? 0,
  };
}

export async function listCampaigns(): Promise<Campaign[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data?.length) return [];

  const out: Campaign[] = [];
  for (const r of data as Record<string, unknown>[]) {
    const c = mapRow(r);
    if (c) out.push(c);
  }
  return out;
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data || typeof data !== "object") return null;
  return mapRow(data as Record<string, unknown>);
}

export async function createCampaign(data: {
  name: string;
  subject: string;
  body_html: string;
  segment: string;
  created_by: string;
}): Promise<Campaign | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: inserted, error } = await supabase
    .from("campaigns")
    .insert({
      name: data.name,
      subject: data.subject,
      body_html: data.body_html,
      segment: data.segment,
      created_by: data.created_by,
      status: "draft",
    })
    .select("*")
    .maybeSingle();

  if (error || !inserted || typeof inserted !== "object") return null;
  return mapRow(inserted as Record<string, unknown>);
}

export async function updateCampaign(
  id: string,
  patch: Partial<Pick<Campaign, "name" | "subject" | "body_html" | "segment">>
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const payload: Record<string, string> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.subject !== undefined) payload.subject = patch.subject;
  if (patch.body_html !== undefined) payload.body_html = patch.body_html;
  if (patch.segment !== undefined) payload.segment = patch.segment;

  if (!Object.keys(payload).length) return true;

  const { error } = await supabase
    .from("campaigns")
    .update(payload)
    .eq("id", id);

  return !error;
}

export async function markCampaignDraftRetry(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase
    .from("campaigns")
    .update({
      status: "draft",
      recipient_count: null,
      sent_at: null,
    })
    .eq("id", id);
}

export async function updateCampaignStatus(
  id: string,
  status: Campaign["status"],
  recipientCount?: number,
  sentAt?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const update: Record<string, unknown> = { status };
  if (recipientCount !== undefined) update.recipient_count = recipientCount;
  if (sentAt !== undefined) update.sent_at = sentAt;

  await supabase.from("campaigns").update(update).eq("id", id);
}
