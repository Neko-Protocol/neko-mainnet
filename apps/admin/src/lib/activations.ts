"use server";

import { backendFetch } from "./backend";

export interface ActivationSummary {
  id: string;
  name: string;
  reward_xlm: number;
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
}

export interface ActivationDetail {
  id: string;
  name: string;
  reward_xlm: number;
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
  expires_at: string;
  emails: string[];
}): Promise<{ id: string }> {
  const res = await backendFetch("v1/activations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
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
}): Promise<{ xdr: string; network_passphrase: string }> {
  const res = await backendFetch("v1/activations/payouts/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    xdr?: string;
    network_passphrase?: string;
    message?: string;
  };
  if (!res.ok) throw new Error(payload.message ?? "Failed to prepare payout");
  return {
    xdr: payload.xdr!,
    network_passphrase: payload.network_passphrase!,
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
