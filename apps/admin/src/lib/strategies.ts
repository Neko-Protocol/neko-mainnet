"use server";

import { backendGet, backendSend } from "./backend";
import type {
  Strategy,
  StrategyStatus,
  StrategyType,
  StrategyWithStats,
} from "@/lib/strategies-schema";

const BASE = "v1/admin/strategies";

export async function listStrategies(): Promise<StrategyWithStats[]> {
  return backendGet(BASE);
}

export async function getStrategyStats(): Promise<{
  total: number;
  active: number;
  paused: number;
  completed: number;
}> {
  return backendGet(`${BASE}/stats`);
}

export async function getStrategy(id: string): Promise<Strategy> {
  return backendGet(`${BASE}/${encodeURIComponent(id)}`);
}

export async function createStrategy(input: {
  name: string;
  description?: string | null;
  type: StrategyType;
  target_count?: number;
  target_volume?: number;
  assigned_to?: string | null;
  status?: StrategyStatus;
}): Promise<Strategy> {
  return backendSend(BASE, "POST", input);
}

export async function updateStrategy(
  id: string,
  patch: Partial<{
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
  await backendSend(`${BASE}/${encodeURIComponent(id)}`, "PATCH", patch);
}

export async function deleteStrategy(id: string): Promise<void> {
  await backendSend(`${BASE}/${encodeURIComponent(id)}`, "DELETE");
}

export async function getStrategyRealVolumeUsd(id: string): Promise<number> {
  const res = await backendGet<{ real_volume: number }>(
    `${BASE}/${encodeURIComponent(id)}/real-volume`
  );
  return res.real_volume;
}
