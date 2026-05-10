"use client";

import { useQuery } from "@tanstack/react-query";

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

export async function fetchVaultApy(vaultId: string): Promise<VaultApyResponse> {
  const res = await fetch(
    `/api/vault/apy?vault=${encodeURIComponent(vaultId)}`
  );
  if (!res.ok) {
    throw new Error(`Failed to load vault APY (${res.status})`);
  }
  const data = (await res.json()) as VaultApyResponse & { error?: string };
  if (data.error) {
    throw new Error(data.error);
  }
  return {
    vaultApy: data.vaultApy ?? null,
    strategies: Array.isArray(data.strategies) ? data.strategies : [],
    note: data.note,
  };
}

/**
 * Client hook around `GET /api/vault/apy` that returns the live APY and
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
