import { getSupabaseAdmin } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

export const SEGMENTS = [
  {
    id: "all",
    label: "All verified users",
    description: "Everyone with a verified email",
  },
  {
    id: "depositors",
    label: "Depositors",
    description:
      "Users who have made at least one deposit (vault, lending, or pool)",
  },
  {
    id: "non_depositors",
    label: "Never deposited",
    description: "Verified users who connected but never deposited",
  },
  {
    id: "swappers_only",
    label: "Swappers (no deposit)",
    description: "Users who swapped but never deposited",
  },
  {
    id: "inactive",
    label: "Inactive",
    description: "Verified users with zero protocol activity",
  },
] as const;

export type SegmentId = (typeof SEGMENTS)[number]["id"];

type Recipient = { email: string; wallet_address: string };

const DEPOSIT_ACTIONS = new Set([
  "vaults_deposit",
  "lend_deposit",
  "pool_repay",
]);

async function paginateAuditLogsMinimal(
  supabase: SupabaseClient
): Promise<{ wallet_address: string; action_type: string }[]> {
  const pageSize = 1000;
  let offset = 0;
  const out: { wallet_address: string; action_type: string }[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("wallet_address,action_type")
      .eq("network", "mainnet")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error || !data?.length) break;
    const rows = data as Row[];
    for (const r of rows) {
      const w =
        typeof r.wallet_address === "string" ? r.wallet_address.trim() : "";
      const at = typeof r.action_type === "string" ? r.action_type.trim() : "";
      if (w) out.push({ wallet_address: w, action_type: at });
    }
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

async function paginateVerifiedUsers(
  supabase: SupabaseClient
): Promise<Recipient[]> {
  const pageSize = 1000;
  let offset = 0;
  const out: Recipient[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from("users")
      .select("email,wallet_address,email_verified_at")
      .not("email", "is", null)
      .not("email_verified_at", "is", null)
      .order("wallet_address", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error || !data?.length) break;
    const rows = data as Row[];
    for (const r of rows) {
      const email =
        typeof r.email === "string" ? r.email.trim().toLowerCase() : "";
      const wallet =
        typeof r.wallet_address === "string" ? r.wallet_address.trim() : "";
      if (!email || !wallet) continue;
      out.push({ email, wallet_address: wallet });
    }
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

function filterRecipients(
  segment: SegmentId,
  verifiedUsers: Recipient[],
  depositorsSet: Set<string>,
  swappersSet: Set<string>,
  anyActivitySet: Set<string>
): Recipient[] {
  switch (segment) {
    case "all":
      return verifiedUsers;
    case "depositors":
      return verifiedUsers.filter((u) => depositorsSet.has(u.wallet_address));
    case "non_depositors":
      return verifiedUsers.filter((u) => !depositorsSet.has(u.wallet_address));
    case "swappers_only":
      return verifiedUsers.filter(
        (u) =>
          swappersSet.has(u.wallet_address) &&
          !depositorsSet.has(u.wallet_address)
      );
    case "inactive":
      return verifiedUsers.filter((u) => !anyActivitySet.has(u.wallet_address));
    default: {
      const _exhaustive: never = segment;
      return _exhaustive;
    }
  }
}

export function isSegmentId(value: unknown): value is SegmentId {
  return (
    typeof value === "string" &&
    (SEGMENTS as readonly { id: string }[]).some((s) => s.id === value)
  );
}

export async function getSegmentRecipients(
  segment: SegmentId
): Promise<Recipient[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const [verifiedUsers, audits] = await Promise.all([
    paginateVerifiedUsers(supabase),
    paginateAuditLogsMinimal(supabase),
  ]);

  const depositorsSet = new Set<string>();
  const swappersSet = new Set<string>();
  const anyActivitySet = new Set<string>();

  for (const row of audits) {
    const w = row.wallet_address;
    if (!w) continue;
    anyActivitySet.add(w);
    if (row.action_type === "swap") swappersSet.add(w);
    if (DEPOSIT_ACTIONS.has(row.action_type)) depositorsSet.add(w);
  }

  return filterRecipients(
    segment,
    verifiedUsers,
    depositorsSet,
    swappersSet,
    anyActivitySet
  );
}

export async function getSegmentCount(segment: SegmentId): Promise<number> {
  const recipients = await getSegmentRecipients(segment);
  return recipients.length;
}
