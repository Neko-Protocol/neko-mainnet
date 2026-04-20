"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/useToast";
import { networkPassphrase } from "@/lib/constants/network";
import type { PoolInfo } from "@/lib/orchestrator";
import {
  buildAddClassicTrustlinesTxXdr,
  getMissingClassicTrustlines,
  submitHorizonTransaction,
} from "@/lib/helpers/stellar/aquaDeposit";

const QUERY_KEY = "aqua-classic-trustlines" as const;

export function useAquaTrustlines(pool: PoolInfo | undefined, enabled: boolean) {
  const { address } = useWallet();
  const tokensStr = pool?.metadata?.tokensStr as string[] | undefined;
  const isAqua = pool?.type === "aqua";

  const query = useQuery({
    queryKey: [QUERY_KEY, address, tokensStr],
    queryFn: () => getMissingClassicTrustlines(address!, tokensStr!),
    enabled:
      enabled &&
      isAqua &&
      Boolean(address) &&
      Array.isArray(tokensStr) &&
      tokensStr.length > 0,
    staleTime: 30_000,
  });

  const missing = query.data;
  const isChecking = enabled && isAqua && (query.isLoading || query.isFetching);
  const checkReady = enabled && isAqua && missing !== undefined && !query.isError;

  /** When this hook is disabled, or pool is not Aqua, do not block the UI. */
  const hasAllClassic =
    !isAqua ||
    !enabled ||
    (missing !== undefined && !query.isError && missing.length === 0);

  return {
    /** Undefined while loading; empty array when every classic asset is trusted. */
    missing,
    hasAllClassic,
    isChecking,
    checkReady,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export function useAddAquaClassicTrustlines(pool: PoolInfo | undefined) {
  const { address, signTransaction } = useWallet();
  const { addNotification } = useToast();
  const queryClient = useQueryClient();
  const tokensStr = pool?.metadata?.tokensStr as string[] | undefined;

  return useMutation({
    mutationFn: async (missing: { code: string; issuer: string }[]) => {
      if (!address) throw new Error("Wallet not connected");
      if (missing.length === 0) return;

      const xdr = await buildAddClassicTrustlinesTxXdr(address, missing);
      const signed = await signTransaction(xdr, { networkPassphrase });
      const signedXdr =
        typeof signed === "string"
          ? signed
          : ((signed as { signedTxXdr?: string }).signedTxXdr ?? "");
      if (!signedXdr) throw new Error("Wallet did not return signed transaction");

      await submitHorizonTransaction(signedXdr);
    },
    onSuccess: async () => {
      addNotification("Trustlines updated", "success");
      await queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, address, tokensStr],
      });
      await queryClient.invalidateQueries({
        queryKey: ["stellar-balances", address],
      });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to add trustlines";
      addNotification(msg, "error");
    },
  });
}
