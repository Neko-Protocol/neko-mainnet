"use server";

import { backendGet, backendSend } from "./backend";
import type { CampaignDTO } from "@/types/campaign";

export type Campaign = CampaignDTO;

const BASE = "v1/admin/campaigns";

export async function getCampaignStats(): Promise<{
  total: number;
  sent: number;
  draft: number;
  tvl_moved_total: number;
}> {
  return backendGet(`${BASE}/stats`);
}

export async function listCampaigns(): Promise<Campaign[]> {
  return backendGet(BASE);
}

export async function getCampaign(id: string): Promise<Campaign> {
  return backendGet(`${BASE}/${encodeURIComponent(id)}`);
}

export async function createCampaign(input: {
  name: string;
  subject: string;
  body_html: string;
  segment: string;
}): Promise<Campaign> {
  return backendSend(BASE, "POST", input);
}

export async function updateCampaign(
  id: string,
  patch: Partial<Pick<Campaign, "name" | "subject" | "body_html" | "segment">>
): Promise<Campaign> {
  return backendSend(`${BASE}/${encodeURIComponent(id)}`, "PATCH", patch);
}

export async function updateCampaignTvl(
  id: string,
  tvl_moved: number | null
): Promise<void> {
  await backendSend(`${BASE}/${encodeURIComponent(id)}/tvl`, "PATCH", {
    tvl_moved,
  });
}

export async function previewCampaign(
  id: string
): Promise<{ count: number; sample: string[] }> {
  return backendGet(`${BASE}/${encodeURIComponent(id)}/preview`);
}

export async function sendCampaign(
  id: string
): Promise<{ ok: true; sent: number }> {
  return backendSend(`${BASE}/${encodeURIComponent(id)}/send`, "POST");
}
