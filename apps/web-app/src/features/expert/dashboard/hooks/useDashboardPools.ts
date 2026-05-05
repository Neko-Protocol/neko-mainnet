import { useMemo } from "react";
import { usePools } from "@/lib/orchestrator";
import type { PoolInfo } from "@/lib/orchestrator";
import type { PoolData } from "@/features/shared/lending/types/lending";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import { formatLiquidity } from "@/lib/helpers/formatUtils";

interface UseDashboardPoolsResult {
  assets: PoolData[];
  isLoading: boolean;
  error: Error | null;
}

export function useDashboardPools(): UseDashboardPoolsResult {
  const { data: allPools = [], isLoading, error } = usePools();

  const assets = useMemo<PoolData[]>(() => {
    const numericLiquidity = (pool: PoolInfo): number => {
      if (pool.type === "aqua" && pool.metadata?.liquidityUsd)
        return parseFloat(String(pool.metadata.liquidityUsd));
      const decimals = pool.tokens[0]?.decimals ?? 7;
      return parseFloat(fromSmallestUnit(pool.tvl.toString(), decimals));
    };

    const depositPools = allPools
      .filter((pool: PoolInfo) => pool.supportedActions.includes("deposit"))
      .sort((a, b) => numericLiquidity(b) - numericLiquidity(a));

    // Take top 6 per protocol so the filter always has 6 options per protocol
    const countByProtocol: Record<string, number> = {};
    return depositPools
      .filter((pool) => {
        const count = countByProtocol[pool.type] ?? 0;
        if (count >= 6) return false;
        countByProtocol[pool.type] = count + 1;
        return true;
      })
      .map((pool: PoolInfo): PoolData => {
        const token1 = pool.tokens[0]?.code ?? "?";
        const token2 =
          pool.tokens.length > 1 ? (pool.tokens[1]?.code ?? "?") : "Lending";

        const decimals = pool.tokens[0]?.decimals ?? 7;
        // Aqua pools store USD liquidity in metadata; others use on-chain TVL
        const rawLiquidity =
          pool.type === "aqua" && pool.metadata?.liquidityUsd
            ? String(pool.metadata.liquidityUsd)
            : fromSmallestUnit(pool.tvl.toString(), decimals);
        const liquidity = formatLiquidity(rawLiquidity);

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
          liquidity,
          isActive: pool.state === "active",
          assetCode: token1,
          asset: token1,
          contractId: pool.id,
          isAggregated: pool.type !== "neko",
          orchestratorId: pool.id,
        };
      });
  }, [allPools]);

  return {
    assets,
    isLoading,
    error: error as Error | null,
  };
}
