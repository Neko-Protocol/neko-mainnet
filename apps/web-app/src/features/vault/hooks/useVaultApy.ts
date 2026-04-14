"use client";

import { useQuery } from "@tanstack/react-query";

interface StrategyApy {
  name: string;
  apy: number | null;
  weight: number;
}

interface VaultApyData {
  vaultApy: number | null;
  strategies: StrategyApy[];
  note?: string;
}

async function fetchVaultApy({
  queryKey,
}: {
  queryKey: readonly unknown[];
}): Promise<VaultApyData> {
  const id = queryKey[1] as string | undefined;
  const q = id ? `?vault=${encodeURIComponent(id)}` : "";
  const res = await fetch(`/api/vault/apy${q}`);
  if (!res.ok) throw new Error("Failed to fetch APY");
  return res.json();
}

export function useVaultApy(vaultContractId: string | null | undefined) {
  return useQuery({
    queryKey: ["vault-apy", vaultContractId],
    queryFn: fetchVaultApy,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
    throwOnError: false,
    enabled: !!vaultContractId,
  });
}
