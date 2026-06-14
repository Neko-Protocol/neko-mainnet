"use client";

import { useQuery } from "@tanstack/react-query";
import { backendClient } from "@/lib/services/backend-client";

export interface VaultApyStrategy {
  name: string;
  apy: number | null;
  weight: number;
}

export interface VaultApyResponse {
  vaultApy: number | null;
  strategies: VaultApyStrategy[];
  note?: string;
}

export async function fetchVaultApy(
  vaultId: string
): Promise<VaultApyResponse> {
  const data = await backendClient.get<VaultApyResponse>(
    `/v1/vault/apy?vault=${encodeURIComponent(vaultId)}`
  );
  return {
    vaultApy: data.vaultApy ?? null,
    strategies: Array.isArray(data.strategies) ? data.strategies : [],
    note: data.note,
  };
}

/**
 * Client hook around `GET /v1/vault/apy` (via backend proxy) that returns the live APY and
 * strategy breakdown for a DeFindex vault.
 */
export function useVaultApy(vaultId: string | null | undefined) {
  const query = useQuery<VaultApyResponse, Error>({
    queryKey: ["vault-apy", vaultId],
    queryFn: () => fetchVaultApy(vaultId as string),
    enabled: Boolean(vaultId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    throwOnError: false,
  });

  return {
    vaultApy: query.data?.vaultApy ?? null,
    strategies: query.data?.strategies ?? [],
    note: query.data?.note,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
