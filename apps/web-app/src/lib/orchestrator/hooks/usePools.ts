"use client";

import { useQuery } from "@tanstack/react-query";
import { orchestrator } from "../core/Orchestrator";
import type { PoolInfo, PoolPosition } from "../types/pool.types";

export const POOLS_QUERY_KEY = ["orchestrator", "pools"] as const;

export function usePools(enabled = true) {
  const blendQuery = useQuery<PoolInfo[]>({
    queryKey: [...POOLS_QUERY_KEY, "blend"],
    queryFn: () => orchestrator.getPoolsByType("blend"),
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
    retry: 2,
    throwOnError: false,
    enabled,
  });

  const aquaQuery = useQuery<PoolInfo[]>({
    queryKey: [...POOLS_QUERY_KEY, "aqua"],
    queryFn: () => orchestrator.getPoolsByType("aqua"),
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
    retry: 2,
    throwOnError: false,
    enabled,
  });

  const blendPools = blendQuery.data ?? [];
  const aquaPools = aquaQuery.data ?? [];
  const data = [...blendPools, ...aquaPools];

  // Treat blend as the "first paint" source and keep others loading in background.
  const isInitialBlendLoad = enabled && blendQuery.isLoading;
  const isLoading = isInitialBlendLoad && data.length === 0;

  return {
    ...blendQuery,
    data,
    isLoading,
    isFetching: blendQuery.isFetching || aquaQuery.isFetching,
    error: blendQuery.error ?? aquaQuery.error,
    refetch: async () => {
      await Promise.all([blendQuery.refetch(), aquaQuery.refetch()]);
    },
  };
}

export function usePoolInfo(poolId: string | undefined) {
  return useQuery<PoolInfo>({
    queryKey: ["orchestrator", "pool", poolId],
    queryFn: () => orchestrator.getPoolInfo(poolId!),
    enabled: !!poolId,
    staleTime: 10_000,
    retry: 1,
    throwOnError: false,
  });
}

export function useUserPosition(
  poolId: string | undefined,
  userAddress: string | undefined
) {
  return useQuery<PoolPosition>({
    queryKey: ["orchestrator", "position", poolId, userAddress],
    queryFn: () => orchestrator.getUserPosition(poolId!, userAddress!),
    enabled: !!poolId && !!userAddress,
    staleTime: 10_000,
    retry: 1,
    throwOnError: false,
  });
}
