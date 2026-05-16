"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { orchestrator } from "@/lib/orchestrator/core/Orchestrator";
import { useWallet } from "@/hooks/useWallet";
import type {
  PoolInfo,
  PoolPosition,
} from "@/lib/orchestrator/types/pool.types";
import type { UserPositionWithPool } from "./useUserPositions";
import {
  DASHBOARD_LIMITS,
  DASHBOARD_POOL_QUERY_OPTS,
} from "./useDashboardPools";
import { batchCheckLpBalances } from "@/lib/services/positionScanner";

export function useDashboardPositions() {
  const { address } = useWallet();

  // ── Pool lists ─────────────────────────────────────────────────────────────
  // Same keys as useDashboardPools → React Query serves from cache, no extra requests.
  const blendQuery = useQuery<PoolInfo[]>({
    queryKey: ["orchestrator", "pools", "blend", DASHBOARD_LIMITS.blend],
    queryFn: () => orchestrator.getPoolsByType("blend", DASHBOARD_LIMITS.blend),
    ...DASHBOARD_POOL_QUERY_OPTS,
  });

  const aquaQuery = useQuery<PoolInfo[]>({
    queryKey: ["orchestrator", "pools", "aqua", DASHBOARD_LIMITS.aqua],
    queryFn: () => orchestrator.getPoolsByType("aqua", DASHBOARD_LIMITS.aqua),
    ...DASHBOARD_POOL_QUERY_OPTS,
  });

  const soroswapQuery = useQuery<PoolInfo[]>({
    queryKey: ["orchestrator", "pools", "soroswap", DASHBOARD_LIMITS.soroswap],
    queryFn: () =>
      orchestrator.getPoolsByType("soroswap", DASHBOARD_LIMITS.soroswap),
    ...DASHBOARD_POOL_QUERY_OPTS,
  });

  const nonBlendPools: PoolInfo[] = [
    ...(aquaQuery.data ?? []),
    ...(soroswapQuery.data ?? []),
  ];

  const poolsReady =
    !blendQuery.isLoading && !aquaQuery.isLoading && !soroswapQuery.isLoading;

  // ── Priority 2: Blend batch ────────────────────────────────────────────────
  // ONE PoolV2.load + ONE loadUser covers all blend reserves → 2 RPC calls total.
  // Wait for pool list to finish before fetching positions so they don't race
  // each other for Soroban RPC bandwidth on page load.
  const blendPositionsQuery = useQuery<PoolPosition[]>({
    queryKey: ["orchestrator", "blend-all-positions", address],
    queryFn: () => orchestrator.getAllBlendUserPositions(address!),
    enabled: Boolean(address) && poolsReady,
    staleTime: 5 * 60_000,
    retry: 3,
    retryDelay: (attempt) => attempt * 1000,
    refetchOnWindowFocus: false,
  });

  // ── Priority 2: LP balance pre-screen ─────────────────────────────────────
  // ONE getLedgerEntries call checks all Aqua + Soroswap LP balances at once.
  // Only pools with a non-zero balance proceed to full getUserPosition queries.
  const lpScreenQuery = useQuery<Set<string>>({
    queryKey: [
      "orchestrator",
      "lp-screen",
      address,
      nonBlendPools.map((p) => p.id).join(","),
    ],
    queryFn: () => batchCheckLpBalances(nonBlendPools, address!),
    enabled: Boolean(address) && poolsReady && nonBlendPools.length > 0,
    staleTime: 60_000,
    retry: 1,
  });

  const poolsWithLpBalance = lpScreenQuery.data ?? null;

  // Only fire getUserPosition for pools that passed the LP pre-screen
  const filteredNonBlendPools =
    poolsWithLpBalance !== null
      ? nonBlendPools.filter((p) => poolsWithLpBalance.has(p.id))
      : []; // wait until screen is done before querying

  const positionQueries = useQueries({
    queries: filteredNonBlendPools.map((pool) => ({
      queryKey: ["orchestrator", "position", pool.id, address],
      queryFn: () => orchestrator.getUserPosition(pool.id, address!),
      enabled: Boolean(address),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  // ── Assemble results ───────────────────────────────────────────────────────
  const allBlendPools = blendQuery.data ?? [];

  const blendPositions: UserPositionWithPool[] = (
    blendPositionsQuery.data ?? []
  )
    .filter((pos) => {
      const hasDeposit = pos.deposited > 0n;
      const hasLiabilities =
        parseFloat(String(pos.metadata?.liabilities ?? "0")) > 0;
      return hasDeposit || hasLiabilities;
    })
    .map((pos) => {
      const pool = allBlendPools.find((p) => p.id === pos.poolId);
      return pool ? { pool, position: pos } : null;
    })
    .filter((entry): entry is UserPositionWithPool => entry !== null);

  const nonBlendPositions: UserPositionWithPool[] = [];
  positionQueries.forEach((q, i) => {
    const pos = q.data as PoolPosition | undefined;
    if (!pos) return;
    const hasDeposit = pos.deposited > 0n;
    const hasLiabilities =
      parseFloat(String(pos.metadata?.liabilities ?? "0")) > 0;
    if (hasDeposit || hasLiabilities) {
      nonBlendPositions.push({ pool: filteredNonBlendPools[i], position: pos });
    }
  });

  const positions = [...blendPositions, ...nonBlendPositions];

  const isLoading =
    !poolsReady ||
    blendPositionsQuery.isLoading ||
    (nonBlendPools.length > 0 && lpScreenQuery.isLoading);

  const poolsLoadFailed =
    blendQuery.isError && !blendQuery.isLoading && !blendQuery.data;
  const isError = blendPositionsQuery.isError || poolsLoadFailed;

  async function refetch() {
    await Promise.all([blendQuery.refetch(), blendPositionsQuery.refetch()]);
  }

  return {
    positions,
    isLoading,
    isError,
    hasWallet: Boolean(address),
    refetch,
  };
}
