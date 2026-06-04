"use client";

import React from "react";
import { useQueries } from "@tanstack/react-query";
import {
  stellarPriceService,
  type PricedResult,
} from "@/lib/services/stellar-price.service";
import { parseBalance } from "@/lib/helpers/formatUtils";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import { usePortfolioValue } from "./usePortfolioValue";
import { useDashboardPositions } from "@/features/expert/dashboard/hooks/useDashboardPositions";
import { useVaultsTotalUsd } from "@/features/expert/dashboard/hooks/useVaultsTotalUsd";

export function useTotalPortfolioUsd() {
  const {
    totalUsd: walletUsd,
    holdings,
    isLoading: isLoadingPortfolio,
  } = usePortfolioValue();
  const { positions, isLoading: isLoadingPositions } = useDashboardPositions();
  const { totalUsd: vaultsTotalUsd, isLoading: isLoadingVaults } =
    useVaultsTotalUsd();

  const walletPriceByCode = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const h of holdings) {
      map[h.code] = h.priceUsd;
    }
    return map;
  }, [holdings]);

  const missingPositionAssets = React.useMemo(() => {
    const dedup = new Map<string, { code: string; contract?: string }>();
    for (const entry of positions) {
      const token = entry.pool.tokens[0];
      if (!token?.code || walletPriceByCode[token.code]) continue;
      const key = `${token.code}:${token.address ?? ""}`;
      dedup.set(key, {
        code: token.code,
        contract: token.address || undefined,
      });
    }
    return Array.from(dedup.values()).sort((a, b) =>
      a.code.localeCompare(b.code)
    );
  }, [positions, walletPriceByCode]);

  // Per-token queries keyed by ["tokenPrice", code] — shared cache with useTokenPrice.
  const missingPriceQueries = useQueries({
    queries: missingPositionAssets.map(({ code, contract }) => ({
      queryKey: ["tokenPrice", code] as const,
      queryFn: (): Promise<PricedResult> =>
        stellarPriceService.getPriceWithSource(code, contract),
      staleTime: 3 * 60_000,
      refetchInterval: 5 * 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
    })),
  });

  const missingPriceMap = React.useMemo(
    () =>
      Object.fromEntries(
        missingPositionAssets.map(({ code }, i) => [
          code,
          missingPriceQueries[i]?.data?.price ?? 0,
        ])
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [missingPositionAssets, missingPriceQueries]
  );

  const positionsNetUsd = React.useMemo(() => {
    return positions.reduce((sum, item) => {
      const token = item.pool.tokens[0];
      if (!token?.code) return sum;

      const price =
        walletPriceByCode[token.code] ?? missingPriceMap[token.code] ?? 0;

      const deposited = parseBalance(item.position.depositedFormatted);
      const liabilitiesRaw = item.position.metadata?.liabilities;
      const liabilities =
        liabilitiesRaw == null
          ? 0
          : Number(
              fromSmallestUnit(String(liabilitiesRaw), token.decimals ?? 7)
            );

      return sum + (deposited - liabilities) * price;
    }, 0);
  }, [positions, walletPriceByCode, missingPriceMap]);

  const totalUsd = walletUsd + positionsNetUsd + vaultsTotalUsd;

  const isLoading = isLoadingPortfolio;

  return { totalUsd, holdings, isLoading };
}
