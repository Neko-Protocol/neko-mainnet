"use client";

import type { EtherfuseYieldEntry } from "@neko/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { getBondYields } from "@/features/shared/yields/services/etherfuse.api";

export type { EtherfuseYieldEntry };

export function useEtherfuseYields() {
  return useQuery({
    queryKey: ["etherfuse-bond-yields"],
    queryFn: async (): Promise<EtherfuseYieldEntry[]> => {
      const data = await getBondYields();
      if (process.env.NODE_ENV === "development") {
        console.log(
          "[useEtherfuseYields] entries from backend endpoint: /v1/etherfuse/bond-yields",
          data?.map((e) => ({
            symbol: e.symbol,
            apy: e.apy,
          }))
        );
      }
      return data;
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}
