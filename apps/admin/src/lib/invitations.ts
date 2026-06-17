"use server";

import { backendGet, backendSend } from "./backend";
import type { Invitation, InvitationType } from "@/lib/invitations-schema";

const BASE = "v1/admin/invitations";
const STRATEGIES = "v1/admin/strategies";

type InvitationFilters = {
  status?: string;
  type?: string;
  assigned_to?: string;
  strategy_id?: string;
};

type CreateInvitationInput = {
  email: string;
  type?: InvitationType | string;
  assigned_to?: string | null;
  notes?: string | null;
  expires_days?: number;
  strategy_id?: string | null;
};

function toQuery(filters: InvitationFilters): string {
  const sp = new URLSearchParams();
  if (filters.status) sp.set("status", filters.status);
  if (filters.type) sp.set("type", filters.type);
  if (filters.assigned_to) sp.set("assigned_to", filters.assigned_to);
  if (filters.strategy_id) sp.set("strategy_id", filters.strategy_id);
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export async function listInvitations(
  filters: InvitationFilters = {}
): Promise<Invitation[]> {
  return backendGet(`${BASE}${toQuery(filters)}`);
}

export async function createInvitation(
  input: CreateInvitationInput
): Promise<Invitation> {
  return backendSend(BASE, "POST", input);
}

export async function acceptInvitation(
  id: string,
  data: { accepted_notes?: string | null; volume_moved?: number | null }
): Promise<Invitation> {
  return backendSend(`${BASE}/${encodeURIComponent(id)}`, "PATCH", data);
}

export async function deleteInvitation(id: string): Promise<void> {
  await backendSend(`${BASE}/${encodeURIComponent(id)}`, "DELETE");
}

export async function listStrategyInvitations(
  strategyId: string,
  filters: { status?: string; type?: string } = {}
): Promise<Invitation[]> {
  const sp = new URLSearchParams();
  if (filters.status) sp.set("status", filters.status);
  if (filters.type) sp.set("type", filters.type);
  const q = sp.toString();
  return backendGet(
    `${STRATEGIES}/${encodeURIComponent(strategyId)}/invitations${q ? `?${q}` : ""}`
  );
}

export async function createStrategyInvitation(
  strategyId: string,
  input: CreateInvitationInput
): Promise<Invitation> {
  return backendSend(
    `${STRATEGIES}/${encodeURIComponent(strategyId)}/invitations`,
    "POST",
    input
  );
}
