import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getAvailableTokens,
  getTokenAddress,
} from "@/lib/helpers/stellar/soroswap";
import type { Token } from "@/lib/helpers/stellar/soroswap";
import {
  stellarPriceService,
  type PriceSource,
  type PricedResult,
} from "@/lib/services/stellar-price.service";

function getTokenCode(token: Token | string | undefined): string | null {
  if (!token) {
    return null;
  }

  try {
    const tokenAddress = getTokenAddress(token);
    const availableTokens = getAvailableTokens();

    for (const [code, info] of Object.entries(availableTokens)) {
      if (info.contract === tokenAddress) {
        return code;
      }
    }

    if (typeof token === "string") {
      return token;
    }

    return null;
  } catch (error) {
    console.error("Error in getTokenCode:", error);
    return null;
  }
}

export const useTokenPrice = (token: Token | string | undefined) => {
  const tokenCode = useMemo(() => getTokenCode(token), [token]);
  const contractAddress = useMemo(
    () => (token ? getTokenAddress(token) : ""),
    [token]
  );

  const { data, isLoading, error, isFetched } = useQuery<PricedResult, Error>({
    queryKey: ["tokenPrice", tokenCode, contractAddress],
    queryFn: async () => {
      if (!tokenCode || typeof tokenCode !== "string") {
        return { price: 0, source: null };
      }

      return stellarPriceService.getPriceWithSource(tokenCode, contractAddress);
    },
    enabled: Boolean(tokenCode && token),
    refetchInterval: 3 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    throwOnError: false,
  });

  const price = data?.price ?? 0;
  const source: PriceSource | null = data?.source ?? null;

  const priceError =
    error?.message ?? (isFetched && price === 0 ? "Price unavailable" : null);

  return {
    price,
    source,
    isLoading,
    error: priceError,
  };
};
