import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { orchestrator } from "@/lib/orchestrator/core/Orchestrator";
import { POOLS_QUERY_KEY } from "@/lib/orchestrator/hooks/usePools";
import type { PoolInfo } from "@/lib/orchestrator";
import type { PoolData } from "@/features/shared/lending/types/lending";
import { fromSmallestUnit } from "@neko/orchestrator";
import { SUMMARY_DISPLAY_DECIMALS } from "@/lib/constants/display";
import { formatLiquidity } from "@/lib/helpers/formatUtils";
import { USE_BACKEND_DASHBOARD } from "./useBackendDashboardPositions";

export const DASHBOARD_LIMITS = { blend: 5, aqua: 2 } as const;
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

interface BackendCatalog {
  blend: PoolInfo[];
  aqua: PoolInfo[];
}

interface WirePoolInfo extends Omit<PoolInfo, "tvl"> {
  tvl: string;
}

interface WirePoolCatalog {
  blend: WirePoolInfo[];
  aqua: WirePoolInfo[];
}

function deserializePools(pools: WirePoolInfo[]): PoolInfo[] {
  return pools.map((p) => ({ ...p, tvl: BigInt(p.tvl || "0") }) as PoolInfo);
}

export function useDashboardPools(): UseDashboardPoolsResult {
  const legacyEnabled = !USE_BACKEND_DASHBOARD;

  // Blend keeps its own LIMIT-scoped key — fetching the full reserve list is
  // expensive (per-reserve TokenMetadata + emissions APY RPC). Aqua shares
  // with usePools via `select` because its limit is an in-memory slice.
  const blendQuery = useQuery<PoolInfo[]>({
    queryKey: ["orchestrator", "pools", "blend", DASHBOARD_LIMITS.blend],
    queryFn: () => orchestrator.getPoolsByType("blend", DASHBOARD_LIMITS.blend),
    ...DASHBOARD_POOL_QUERY_OPTS,
    enabled: legacyEnabled,
  });

  const aquaQuery = useQuery<PoolInfo[], Error, PoolInfo[]>({
    queryKey: [...POOLS_QUERY_KEY, "aqua"],
    queryFn: () => orchestrator.getPoolsByType("aqua"),
    select: (pools) => pools.slice(0, DASHBOARD_LIMITS.aqua),
    ...DASHBOARD_POOL_QUERY_OPTS,
    enabled: legacyEnabled,
  });

  const backendCatalogQuery = useQuery<BackendCatalog>({
    queryKey: ["dashboard-pool-catalog"],
    enabled: USE_BACKEND_DASHBOARD,
    staleTime: 3 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch("/api/backend-proxy/dashboard/pool-catalog");
      if (!res.ok) throw new Error(`pool-catalog failed: ${res.status}`);
      const json = (await res.json()) as WirePoolCatalog;
      return {
        blend: deserializePools(json.blend ?? []),
        aqua: deserializePools(json.aqua ?? []),
      };
    },
  });

  const allPools = useMemo(() => {
    if (USE_BACKEND_DASHBOARD) {
      const data = backendCatalogQuery.data;
      if (!data) return [] as PoolInfo[];
      return [...data.blend, ...data.aqua.slice(0, DASHBOARD_LIMITS.aqua)];
    }
    return [...(blendQuery.data ?? []), ...(aquaQuery.data ?? [])];
  }, [blendQuery.data, aquaQuery.data, backendCatalogQuery.data]);

  const assets = useMemo(
    () =>
      allPools
        .filter((p) => p.supportedActions.includes("deposit"))
        .map(toPoolData),
    [allPools]
  );

  const isLoading = USE_BACKEND_DASHBOARD
    ? backendCatalogQuery.isLoading
    : blendQuery.isLoading && aquaQuery.isLoading;
  const error = USE_BACKEND_DASHBOARD
    ? backendCatalogQuery.error
    : (blendQuery.error ?? aquaQuery.error);

  return { assets, isLoading, error: error as Error | null };
}
