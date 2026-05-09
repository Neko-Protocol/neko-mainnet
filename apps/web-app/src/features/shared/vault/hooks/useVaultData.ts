import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Client as DefindexVaultClient } from "@neko/defindex-vault";
import {
  rpcUrl,
  networkPassphrase,
  allowHttpForSoroban,
} from "@/lib/constants/network";
import { fromSmallestUnit } from "@/lib/helpers/tokenUtils";
import { formatLiquidity } from "@/lib/helpers/formatUtils";
import type { VaultLiveStats } from "../types/vault";

const ONE_SHARE = 1_000_000_000_000n;

function formatTvl(stroops: bigint): string {
  const value = Number(fromSmallestUnit(stroops.toString(), 7));
  return formatLiquidity(value);
}

type SdkResultLike = {
  unwrap?: () => unknown;
  tag?: string;
  value?: unknown;
};

/** Safely extracts the value from a stellar SDK Result<T> or a raw value. */
function unwrapResult<T>(result: unknown, fallback: T): T {
  if (result === null || result === undefined) return fallback;
  const r = result as SdkResultLike;
  // Ok/Err objects from @stellar/stellar-sdk/contract
  if (typeof r.unwrap === "function") {
    try {
      return r.unwrap() as T;
    } catch {
      return fallback;
    }
  }
  // Some SDK versions expose .value directly on Ok
  if (r.tag === "ok") return r.value as T;
  // Already a raw value (e.g. i128 methods)
  return result as T;
}

export function useVaultData(contractId: string | null | undefined) {
  const client = useMemo(
    () =>
      contractId
        ? new DefindexVaultClient({
            contractId,
            rpcUrl,
            networkPassphrase,
            ...(allowHttpForSoroban && { allowHttp: true }),
          })
        : null,
    [contractId]
  );

  return useQuery<VaultLiveStats & { tvlFormatted: string }>({
    queryKey: ["vaultData", contractId],
    queryFn: async () => {
      if (!client) throw new Error("No vault configured");
      const [totalManagedTx, totalSupplyTx] = await Promise.all([
        client.fetch_total_managed_funds({ simulate: true }),
        client.total_supply({ simulate: true }),
      ]);

      const allocations = unwrapResult<Array<{ total_amount: bigint }>>(
        totalManagedTx.result,
        []
      );
      const tvl =
        allocations.length > 0
          ? BigInt(allocations[0].total_amount.toString())
          : 0n;

      const totalShares = BigInt(totalSupplyTx.result?.toString() ?? "0");

      // price per share scaled by 1e12 to avoid integer division loss
      // pricePerShare = tvl * 1e12 / totalShares
      // userValue = userShares * pricePerShare / 1e12
      const pricePerShare =
        totalShares > 0n ? (tvl * ONE_SHARE) / totalShares : 0n;

      return {
        tvl,
        totalShares,
        pricePerShare,
        tvlFormatted: formatTvl(tvl),
      };
    },
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
    throwOnError: false,
    enabled: !!contractId && !!client,
  });
}
