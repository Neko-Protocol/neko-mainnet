"use client";

import { useQuery } from "@tanstack/react-query";

export interface EtherfuseYieldEntry {
  symbol: string;
  apy: number;
  currency: string;
  lastUpdated: string;
  isFallback?: boolean;
}

export function useEtherfuseYields() {
  return useQuery({
    queryKey: ["etherfuse-bond-yields"],
    queryFn: async (): Promise<EtherfuseYieldEntry[]> => {
      const res = await fetch("/api/etherfuse/bond-yields");
      if (!res.ok) throw new Error("Failed to fetch bond yields");
      const data = (await res.json()) as EtherfuseYieldEntry[];
      if (process.env.NODE_ENV === "development") {
        console.log(
          "[useEtherfuseYields] entries from /api/etherfuse/bond-yields",
          data?.map((e) => ({
            symbol: e.symbol,
            apy: e.apy,
            isFallback: e.isFallback,
          }))
        );
      }
      return data;
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}
