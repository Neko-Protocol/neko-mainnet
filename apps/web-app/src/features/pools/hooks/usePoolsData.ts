"use client";

import { useMemo, useState, useCallback } from "react";
import { usePools } from "@/lib/orchestrator";
import type { PoolInfo } from "@/lib/orchestrator";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import { formatLiquidity } from "../utils/poolUtils";
import type { PoolCardData } from "../types/pools";

export type PoolTypeFilter = "all" | "lending" | "amm";

function isLendingPoolType(type: string): boolean {
  return type === "blend" || type === "neko";
}

function matchesTypeFilter(poolType: string, filter: PoolTypeFilter): boolean {
  if (filter === "all") return true;
  if (filter === "lending") return isLendingPoolType(poolType);
  if (filter === "amm") return poolType === "soroswap" || poolType === "aqua";
  return true;
}

export function usePoolsData() {
  const { data: allPools = [], isLoading, isFetching, error } = usePools();
  const [typeFilter, setTypeFilter] = useState<PoolTypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSetTypeFilter = useCallback((f: PoolTypeFilter) => {
    setTypeFilter(f);
  }, []);

  const handleSetSearchQuery = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const pools: PoolCardData[] = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return allPools
      .filter((pool: PoolInfo) => matchesTypeFilter(pool.type, typeFilter))
      .filter((pool: PoolInfo) => {
        if (!query) return true;
        const tokenNames = pool.tokens.map((t) => t.code.toLowerCase());
        return (
          tokenNames.some((n) => n.includes(query)) ||
          pool.name.toLowerCase().includes(query)
        );
      })
      .map((pool: PoolInfo) => {
        const token1 = pool.tokens[0]?.code ?? "?";
        const token2 =
          pool.tokens.length > 1
            ? (pool.tokens[1]?.code ?? "?")
            : pool.type === "blend"
              ? "Lending"
              : "?";

        const decimals = pool.tokens[0]?.decimals ?? 7;
        const tokenAmount = fromSmallestUnit(pool.tvl.toString(), decimals);

        // For Aqua, tvl is 0n and liquidityUsd is in metadata — already USD.
        // For Blend/Soroswap, tvl is in tokens; the table cell will price it.
        const isUsdAlready = pool.type === "aqua";
        const liquidityTokenCode = isUsdAlready
          ? undefined
          : (pool.tokens[0]?.code ?? undefined);
        const liquidity = isUsdAlready
          ? formatLiquidity(
              String((pool.metadata.liquidityUsd as string | undefined) ?? "0")
            )
          : formatLiquidity(tokenAmount);

        const apy = pool.apy > 0 ? `${pool.apy.toFixed(2)}%` : "0.00%";

        // Total borrowed — only meaningful for Blend lending pools
        let totalBorrowed = "-";
        let totalBorrowedTokenAmount: string | undefined;
        if (pool.type === "blend") {
          const liabRaw = String(
            (pool.metadata.totalLiabilities as string | undefined) ?? "0"
          );
          totalBorrowedTokenAmount = fromSmallestUnit(liabRaw, decimals);
          totalBorrowed = formatLiquidity(totalBorrowedTokenAmount);
        }

        return {
          id: pool.id,
          token1,
          token2,
          fee: "0%",
          roi: apy,
          feeApy: apy,
          liquidity,
          liquidityTokenAmount: isUsdAlready ? undefined : tokenAmount,
          liquidityTokenCode,
          totalBorrowed,
          totalBorrowedTokenAmount,
          isActive: pool.state === "active",
          type: pool.type,
        };
      });
  }, [allPools, typeFilter, searchQuery]);

  return {
    pools,
    isLoading,
    isFetching,
    error,
    typeFilter,
    setTypeFilter: handleSetTypeFilter,
    searchQuery,
    setSearchQuery: handleSetSearchQuery,
  };
}
