"use server";

import { backendGet, backendSend } from "./backend";
import type {
  CatalogDestination,
  DestinationKind,
  RecommendedStrategy,
} from "@/lib/recommended-strategies-schema";

const BASE = "v1/admin/recommended";

export async function listCatalogDestinations(): Promise<CatalogDestination[]> {
  const res = await backendGet<{ destinations: CatalogDestination[] }>(
    `${BASE}/catalog`
  );
  return res.destinations;
}

export async function listRecommendedStrategies(): Promise<
  RecommendedStrategy[]
> {
  return backendGet(BASE);
}

export async function getRecommendedStrategy(
  id: string
): Promise<RecommendedStrategy> {
  return backendGet(`${BASE}/${encodeURIComponent(id)}`);
}

export async function createRecommendedStrategy(input: {
  name: string;
  description?: string | null;
  token_code: string;
  destination_kind: DestinationKind | string;
  destination_id: string;
  stack_kind?: DestinationKind | string | null;
  stack_id?: string | null;
  amount?: number | null;
  snapshot_apy?: number | null;
  position?: number;
  is_active?: boolean;
}): Promise<RecommendedStrategy> {
  return backendSend(BASE, "POST", input);
}

export async function updateRecommendedStrategy(
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  await backendSend(`${BASE}/${encodeURIComponent(id)}`, "PATCH", patch);
}

export async function deleteRecommendedStrategy(id: string): Promise<void> {
  await backendSend(`${BASE}/${encodeURIComponent(id)}`, "DELETE");
}
