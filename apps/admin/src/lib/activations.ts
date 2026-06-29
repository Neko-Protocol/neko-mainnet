"use server";

import { backendFetch } from "./backend";

export type PayoutAsset = "XLM" | "USDC";

export interface ActivationSummary {
  id: string;
  name: string;
  reward_xlm: number;
  reward_amount: number;
  payout_asset: PayoutAsset;
  expires_at: string;
  created_at: string;
  counts: { total: number; pending: number; payable: number; paid: number };
}

export type ParticipantStatus = "pending" | "payable" | "paying" | "paid";

export interface Participant {
  id: string;
  email: string;
  status: ParticipantStatus;
  matched_wallet: string | null;
  matched_at: string | null;
  paid_tx_hash: string | null;
  paid_by: string | null;
  paid_at: string | null;
  paid_amount_xlm: number | null;
  paid_asset: string | null;
  paid_amount: number | null;
}

export interface BatchPayoutSkipped {
  participant_id: string;
  reason: string;
}

export interface ActivationDetail {
  id: string;
  name: string;
  reward_xlm: number;
  reward_amount: number;
  payout_asset: PayoutAsset;
  expires_at: string;
  created_at: string;
  participants: Participant[];
}

export async function listActivations(): Promise<ActivationSummary[]> {
  const res = await backendFetch("v1/activations");
  if (!res.ok) throw new Error("Failed to load activations");
  return res.json() as Promise<ActivationSummary[]>;
}

export async function getActivation(id: string): Promise<ActivationDetail> {
  const res = await backendFetch(`v1/activations/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Failed to load activation");
  return res.json() as Promise<ActivationDetail>;
}

export async function createActivation(data: {
  name: string;
  reward_xlm: number;
  payout_asset?: PayoutAsset;
  expires_at: string;
  emails: string[];
  send_invites?: boolean;
}): Promise<{ id: string }> {
  const res = await backendFetch("v1/activations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name,
      reward_xlm: data.reward_xlm,
      payout_asset: data.payout_asset ?? "XLM",
      expires_at: data.expires_at,
      emails: data.emails,
      send_invites: data.send_invites ?? false,
    }),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };
  if (!res.ok)
    throw new Error(payload.message ?? "Failed to create activation");
  if (!payload.id) throw new Error("Missing activation id");
  return { id: payload.id };
}

export async function prepareActivationPayout(data: {
  participant_id: string;
  admin_wallet: string;
}): Promise<{
  xdr: string;
  network_passphrase: string;
  payout_asset: PayoutAsset;
}> {
  const res = await backendFetch("v1/activations/payouts/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    xdr?: string;
    network_passphrase?: string;
    payout_asset?: PayoutAsset;
    message?: string;
    code?: string;
  };
  if (!res.ok) {
    if (payload.code === "NO_TRUSTLINE") {
      throw new Error(
        "Recipient has no USDC trustline. They must add USDC on Stellar before this payout can proceed."
      );
    }
    throw new Error(payload.message ?? "Failed to prepare payout");
  }
  return {
    xdr: payload.xdr!,
    network_passphrase: payload.network_passphrase!,
    payout_asset: payload.payout_asset ?? "XLM",
  };
}

export async function cancelActivationPayout(data: {
  participant_id: string;
}): Promise<void> {
  await backendFetch("v1/activations/payouts/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function submitActivationPayout(data: {
  participant_id: string;
  signed_xdr: string;
}): Promise<void> {
  const res = await backendFetch("v1/activations/payouts/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const payload = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) throw new Error(payload.message ?? "Payment failed");
}

export async function sendActivationInvites(
  id: string
): Promise<{ sent: number }> {
  const res = await backendFetch(
    `v1/activations/${encodeURIComponent(id)}/send-invites`,
    { method: "POST" }
  );
  const payload = (await res.json().catch(() => ({}))) as {
    sent?: number;
    message?: string;
  };
  if (!res.ok) throw new Error(payload.message ?? "Failed to send invites");
  return { sent: payload.sent ?? 0 };
}

export async function prepareBatchActivationPayout(data: {
  activation_id: string;
  admin_wallet: string;
}): Promise<{
  activation_id: string;
  xdr: string;
  network_passphrase: string;
  participant_ids: string[];
  reward_xlm: number;
  reward_amount: number;
  payout_asset: PayoutAsset;
  op_count: number;
  remaining_payable: number;
  skipped: BatchPayoutSkipped[];
}> {
  const res = await backendFetch("v1/activations/payouts/prepare-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    activation_id?: string;
    xdr?: string;
    network_passphrase?: string;
    participant_ids?: string[];
    reward_xlm?: number;
    reward_amount?: number;
    payout_asset?: PayoutAsset;
    op_count?: number;
    remaining_payable?: number;
    skipped?: BatchPayoutSkipped[];
    message?: string;
  };
  if (!res.ok)
    throw new Error(payload.message ?? "Failed to prepare batch payout");
  return {
    activation_id: payload.activation_id!,
    xdr: payload.xdr!,
    network_passphrase: payload.network_passphrase!,
    participant_ids: payload.participant_ids ?? [],
    reward_xlm: payload.reward_xlm ?? 0,
    reward_amount: payload.reward_amount ?? payload.reward_xlm ?? 0,
    payout_asset: payload.payout_asset ?? "XLM",
    op_count: payload.op_count ?? 0,
    remaining_payable: payload.remaining_payable ?? 0,
    skipped: payload.skipped ?? [],
  };
}

export async function submitBatchActivationPayout(data: {
  activation_id: string;
  participant_ids: string[];
  signed_xdr: string;
}): Promise<{ ok: boolean; tx_hash: string; paid: number }> {
  const res = await backendFetch("v1/activations/payouts/submit-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    tx_hash?: string;
    paid?: number;
    message?: string;
  };
  if (!res.ok) throw new Error(payload.message ?? "Batch payment failed");
  return {
    ok: payload.ok ?? true,
    tx_hash: payload.tx_hash ?? "",
    paid: payload.paid ?? 0,
  };
}
