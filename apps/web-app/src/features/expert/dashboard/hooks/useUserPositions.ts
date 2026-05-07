"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { usePools } from "@/lib/orchestrator/hooks/usePools";
import { orchestrator } from "@/lib/orchestrator/core/Orchestrator";
import { useWallet } from "@/hooks/useWallet";
import { getBlendPoolIds } from "@/lib/orchestrator/adapters/blend-config";
import { scanUserContractInteractions } from "@/lib/services/horizonActivityScanner";
import { batchCheckLpBalances } from "@/lib/services/positionScanner";
import type {
  PoolInfo,
  PoolPosition,
} from "@/lib/orchestrator/types/pool.types";

export interface UserPositionWithPool {
  pool: PoolInfo;
  position: PoolPosition;
}

const POSITION_STALE_TIME = 60_000;

export function useUserPositions() {
  const { address } = useWallet();

  // ── All pools ──────────────────────────────────────────────────────────────
  const { data: pools = [], isLoading: isLoadingPools } = usePools();

  const blendPools = pools.filter((p) => p.type === "blend");
  const nonBlendPools = pools.filter((p) => p.type !== "blend");

  // ── Priority 2: Horizon activity scan ─────────────────────────────────────
  // Decodes Horizon tx envelopes to find which Soroban contracts the user has
  // ever called. Cached 10 min — runs once per session in practice.
  const horizonScanQuery = useQuery<Set<string>>({
    queryKey: ["horizon-scan", address],
    queryFn: () => scanUserContractInteractions(address!),
    enabled: Boolean(address),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });

  const knownContracts = horizonScanQuery.data;
  const blendContractIds = getBlendPoolIds();

  // While scan hasn't returned yet, assume the user might have blend history
  // (conservative default so we don't skip on first load).
  // After the first scan completes it is cached and the check is instant.
  const hasBlendHistory =
    knownContracts == null ||
    blendContractIds.some((id) => knownContracts.has(id));

  // ── Blend batch query ──────────────────────────────────────────────────────
  // ONE PoolV2.load + ONE loadUser covers every blend reserve → 2 RPC calls.
  // Skipped entirely on subsequent visits when Horizon scan confirms no history.
  const blendPositionsQuery = useQuery<PoolPosition[]>({
    queryKey: ["orchestrator", "blend-all-positions", address],
    queryFn: () => orchestrator.getAllBlendUserPositions(address!),
    enabled: Boolean(address) && hasBlendHistory,
    staleTime: POSITION_STALE_TIME,
    retry: 1,
  });

  // ── LP balance pre-screen (Aqua + Soroswap) ───────────────────────────────
  // ONE getLedgerEntries call checks all LP / share token balances at once.
  // Pools with no balance are filtered out before any getUserPosition fires.
  const lpScreenQuery = useQuery<Set<string>>({
    queryKey: [
      "orchestrator",
      "lp-screen",
      address,
      nonBlendPools.map((p) => p.id).join(","),
    ],
    queryFn: () => batchCheckLpBalances(nonBlendPools, address!),
    enabled: Boolean(address) && !isLoadingPools && nonBlendPools.length > 0,
    staleTime: POSITION_STALE_TIME,
    retry: 1,
  });

  // Only query getUserPosition for pools that passed the LP pre-screen.
  // If the screen hasn't run yet, hold off (empty array) to avoid a wasted burst.
  const poolsWithBalance = lpScreenQuery.data ?? null;
  const filteredNonBlendPools =
    poolsWithBalance !== null
      ? nonBlendPools.filter((p) => poolsWithBalance.has(p.id))
      : [];

  const positionQueries = useQueries({
    queries: filteredNonBlendPools.map((pool) => ({
      queryKey: ["orchestrator", "position", pool.id, address],
      queryFn: () => orchestrator.getUserPosition(pool.id, address!),
      enabled: Boolean(address),
      staleTime: POSITION_STALE_TIME,
      retry: 1,
    })),
  });

  // ── Assemble results ───────────────────────────────────────────────────────
  const positions: UserPositionWithPool[] = [];

  // Blend positions (from batch)
  for (const pos of blendPositionsQuery.data ?? []) {
    const hasDeposit = pos.deposited > 0n;
    const hasLiabilities =
      parseFloat(String(pos.metadata?.liabilities ?? "0")) > 0;
    if (!hasDeposit && !hasLiabilities) continue;

    const pool = blendPools.find((p) => p.id === pos.poolId);
    if (pool) positions.push({ pool, position: pos });
  }

  // Aqua + Soroswap positions (only pre-screened)
  positionQueries.forEach((q, i) => {
    const pos = q.data as PoolPosition | undefined;
    if (!pos) return;
    const hasDeposit = pos.deposited > 0n;
    const hasLiabilities =
      parseFloat(String(pos.metadata?.liabilities ?? "0")) > 0;
    if (hasDeposit || hasLiabilities) {
      positions.push({ pool: filteredNonBlendPools[i], position: pos });
    }
  });

  const isLoading =
    isLoadingPools ||
    horizonScanQuery.isLoading ||
    (hasBlendHistory && blendPositionsQuery.isLoading) ||
    (nonBlendPools.length > 0 && lpScreenQuery.isLoading);

  return { positions, isLoading, hasWallet: Boolean(address) };
}
