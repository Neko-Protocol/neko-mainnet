"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { stellarPriceService } from "@/lib/services/stellar-price.service";
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

  const { data: missingPriceMap = {}, isLoading: isLoadingMissingPrices } =
    useQuery<Record<string, number>>({
      queryKey: [
        "dashboard-missing-position-prices",
        missingPositionAssets
          .map((asset) => `${asset.code}:${asset.contract ?? ""}`)
          .join("|"),
      ],
      queryFn: async () => {
        const entries = await Promise.all(
          missingPositionAssets.map(async ({ code, contract }) => {
            const price = await stellarPriceService.getPrice(code, contract);
            return [code, price] as const;
          })
        );
        return Object.fromEntries(entries);
      },
      enabled: missingPositionAssets.length > 0,
      staleTime: 3 * 60_000,
      refetchInterval: 5 * 60_000,
    });

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
