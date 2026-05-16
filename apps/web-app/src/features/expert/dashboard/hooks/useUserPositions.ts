"use client";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { POOLS_QUERY_KEY } from "@/lib/orchestrator/hooks/usePools";
import { orchestrator } from "@/lib/orchestrator/core/Orchestrator";
import { useWallet } from "@/hooks/useWallet";
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
  const queryClient = useQueryClient();

  // ── Blend pools (explicit fetch) ───────────────────────────────────────────
  // We fetch blend pools explicitly so we know exactly when they're ready.
  // usePools().isLoading turns false as soon as any pool type resolves, so
  // we'd race to fetch positions against a still-empty blendPools list.
  const blendListQuery = useQuery<PoolInfo[]>({
    queryKey: [...POOLS_QUERY_KEY, "blend"],
    queryFn: () => orchestrator.getPoolsByType("blend"),
    staleTime: 3 * 60_000,
    retry: 2,
    throwOnError: false,
  });

  const blendPools = blendListQuery.data ?? [];

  // ── Non-blend pools (cache-only, no fresh fetch) ───────────────────────────
  // Reading from cache prevents triggering fresh Soroswap/Aqua pool discovery
  // here, which would flood the API with 429s when navigating directly to My
  // Positions. The Pools tab's usePools() populates this cache on first visit.
  const cachedSoroswap =
    queryClient.getQueryData<PoolInfo[]>([...POOLS_QUERY_KEY, "soroswap"]) ??
    [];
  const cachedAqua =
    queryClient.getQueryData<PoolInfo[]>([...POOLS_QUERY_KEY, "aqua"]) ?? [];
  const nonBlendPools = [...cachedSoroswap, ...cachedAqua];

  // ── Blend batch query ──────────────────────────────────────────────────────
  // ONE PoolV2.load + ONE loadUser covers every blend reserve → 2 RPC calls.
  // Wait for blend pool list specifically so both don't race for RPC bandwidth.
  // Note: we do NOT pre-screen via Horizon tx history here because sub-contract
  // calls (e.g. depositing via a DeFindex vault) are invisible to the scanner.
  const blendPositionsQuery = useQuery<PoolPosition[]>({
    queryKey: ["orchestrator", "blend-all-positions", address],
    queryFn: () => orchestrator.getAllBlendUserPositions(address!),
    enabled: Boolean(address) && !blendListQuery.isLoading,
    staleTime: POSITION_STALE_TIME,
    retry: 3,
    retryDelay: (attempt) => attempt * 1000,
    refetchOnWindowFocus: false,
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
    retry: 2,
    retryDelay: (attempt) => attempt * 800,
  });

  // Only query getUserPosition for pools that passed the LP pre-screen.
  // If the screen hasn't run yet, hold off (empty array) to avoid a wasted burst.
  const poolsWithBalance = lpScreenQuery.data ?? null;
  const filteredNonBlendPools =
    poolsWithBalance !== null
      ? nonBlendPools.filter((p) => poolsWithBalance.has(p.id))
      : [];

  const positionQueries = useQueries({
    queries: filteredNonBlendPools.map((pool, i) => ({
      queryKey: ["orchestrator", "position", pool.id, address],
      queryFn: async () => {
        if (i > 0) await new Promise((r) => setTimeout(r, i * 300));
        return orchestrator.getUserPosition(pool.id, address!);
      },
      enabled: Boolean(address),
      staleTime: POSITION_STALE_TIME,
      retry: 2,
      retryDelay: (attempt: number) => attempt * 1000,
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
    blendListQuery.isLoading ||
    blendPositionsQuery.isLoading ||
    (nonBlendPools.length > 0 && lpScreenQuery.isLoading);

  return { positions, isLoading, hasWallet: Boolean(address) };
}
