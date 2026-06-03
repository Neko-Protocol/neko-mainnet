import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { stellarPriceService } from "@/lib/services/stellar-price.service";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import { parseBalance } from "@/lib/helpers/formatUtils";

export interface PortfolioHolding {
  code: string;
  balance: number;
  priceUsd: number;
  valueUsd: number;
}

interface PortfolioValue {
  totalUsd: number;
  holdings: PortfolioHolding[];
  isLoading: boolean;
  error: Error | null;
}

function getContractForToken(code: string): string | undefined {
  const asset = getAssetsConfig()[code];
  return asset?.contract;
}

export function usePortfolioValue(): PortfolioValue {
  const { balances, address, isFetchingBalances } = useWallet();

  const balanceEntries = useMemo(
    () =>
      Object.entries(balances)
        .map(([key, bal]) => {
          let code: string | null = null;
          if (bal.asset_type === "native") {
            code = "XLM";
          } else if (bal.asset_type === "liquidity_pool_shares") {
            code = null;
          } else if ("asset_code" in bal && bal.asset_code) {
            code = bal.asset_code;
          }
          return { key, code, rawBalance: bal.balance };
        })
        .filter(
          (e): e is { key: string; code: string; rawBalance: string } =>
            e.code !== null && parseBalance(e.rawBalance) > 0
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [balances]
  );

  // Prices are keyed by which tokens are held (not amounts) so they survive
  // balance changes without a round-trip. The value calculation in useMemo
  // below always uses the latest balance.
  const tokenCodesKey = useMemo(
    () => balanceEntries.map((e) => e.code).sort().join("|"),
    [balanceEntries]
  );

  const {
    data: priceMap = {},
    isLoading: isLoadingPrices,
    error,
  } = useQuery<Record<string, number>>({
    queryKey: ["portfolio-prices", address, tokenCodesKey],
    queryFn: async () => {
      const entries = await Promise.allSettled(
        balanceEntries.map(async (entry) => {
          const price = await stellarPriceService.getPrice(
            entry.code,
            getContractForToken(entry.code)
          );
          return [entry.code, price] as const;
        })
      );
      return Object.fromEntries(
        entries
          .filter(
            (r): r is PromiseFulfilledResult<readonly [string, number]> =>
              r.status === "fulfilled"
          )
          .map((r) => r.value)
      );
    },
    enabled: Boolean(address) && balanceEntries.length > 0,
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
  });

  // Recalculated whenever balances or prices change — no extra fetch needed.
  const holdings = useMemo<PortfolioHolding[]>(() => {
    return balanceEntries
      .map((entry) => {
        const balance = parseBalance(entry.rawBalance);
        const priceUsd = priceMap[entry.code] ?? 0;
        return { code: entry.code, balance, priceUsd, valueUsd: balance * priceUsd };
      })
      .sort((a, b) => b.valueUsd - a.valueUsd);
  }, [balanceEntries, priceMap]);

  const totalUsd = useMemo(
    () => holdings.reduce((sum, h) => sum + h.valueUsd, 0),
    [holdings]
  );

  return {
    totalUsd,
    holdings,
    isLoading: isFetchingBalances || isLoadingPrices,
    error: error as Error | null,
  };
}
