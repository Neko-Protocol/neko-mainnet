import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { orchestrator } from "@/lib/orchestrator/core/Orchestrator";
import type { PoolInfo } from "@/lib/orchestrator";
import type { PoolData } from "@/features/lending/types/lending";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import { SUMMARY_DISPLAY_DECIMALS } from "@/lib/constants/display";
import { formatLiquidity } from "@/lib/helpers/formatUtils";

export const DASHBOARD_LIMITS = { blend: 5, aqua: 2, soroswap: 2 } as const;
export const DASHBOARD_POOL_QUERY_OPTS = {
  refetchInterval: 5 * 60_000,
  staleTime: 3 * 60_000,
} as const;

interface UseDashboardPoolsResult {
  assets: PoolData[];
  isLoading: boolean;
  error: Error | null;
}

function toPoolData(pool: PoolInfo): PoolData {
  const token1 = pool.tokens[0]?.code ?? "?";
  const token2 =
    pool.tokens.length > 1 ? (pool.tokens[1]?.code ?? "?") : "Lending";
  const decimals = pool.tokens[0]?.decimals ?? 7;
  const rawLiquidity =
    pool.type === "aqua" && pool.metadata?.liquidityUsd
      ? String(pool.metadata.liquidityUsd)
      : fromSmallestUnit(pool.tvl.toString(), decimals);
  const apy = pool.apy > 0 ? `${pool.apy.toFixed(2)}%` : "0.00%";

  return {
    id: pool.id,
    protocolId: pool.type,
    name: pool.name,
    token1,
    token2,
    fee: "0%",
    roi: apy,
    feeApy: apy,
    liquidity: formatLiquidity(rawLiquidity, SUMMARY_DISPLAY_DECIMALS),
    isActive: pool.state === "active",
    assetCode: token1,
    asset: token1,
    contractId: pool.id,
    isAggregated: pool.type !== "neko",
    orchestratorId: pool.id,
  };
}

export function useDashboardPools(): UseDashboardPoolsResult {
  // Separate limited queries per protocol — distinct keys so they don't
  // conflict with the full-list queries used on Discover/Vaults pages.
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

  const allPools = useMemo(
    () => [
      ...(blendQuery.data ?? []),
      ...(aquaQuery.data ?? []),
      ...(soroswapQuery.data ?? []),
    ],
    [blendQuery.data, aquaQuery.data, soroswapQuery.data]
  );

  const assets = useMemo(
    () =>
      allPools
        .filter((p) => p.supportedActions.includes("deposit"))
        .map(toPoolData),
    [allPools]
  );

  const isLoading =
    blendQuery.isLoading && aquaQuery.isLoading && soroswapQuery.isLoading;
  const error = blendQuery.error ?? aquaQuery.error ?? soroswapQuery.error;

  return { assets, isLoading, error: error as Error | null };
}
