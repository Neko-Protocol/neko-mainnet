"use client";

import { useQueries } from "@tanstack/react-query";
import { useDefindexVaults } from "@/features/shared/vault/hooks/useDefindexVaults";
import { fetchVaultApy } from "@/features/shared/vault/hooks/useVaultApy";

function parseApy7d(apy7d: string): number | null {
  if (!apy7d) return null;
  const numeric = apy7d.replace(/[^\d.]/g, "");
  const parsed = parseFloat(numeric);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function useHighestVaultApy() {
  const { data: defindexPayload, isPending: vaultsPending } =
    useDefindexVaults();
  const vaults = defindexPayload?.vaults ?? [];

  const apyQueries = useQueries({
    queries: vaults.map((vault) => ({
      queryKey: ["vault-apy", vault.id] as const,
      queryFn: () => fetchVaultApy(vault.id),
      enabled: vaults.length > 0,
      staleTime: 5 * 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
      throwOnError: false as const,
    })),
  });

  let highestApy: number | null = null;
  for (let i = 0; i < vaults.length; i++) {
    const live = apyQueries[i]?.data?.vaultApy ?? null;
    const apy =
      live != null && live > 0 ? live : parseApy7d(vaults[i]?.apy7d ?? "");
    if (apy !== null && (highestApy === null || apy > highestApy)) {
      highestApy = apy;
    }
  }

  const apyPending =
    vaults.length > 0 &&
    apyQueries.some((query) => query.isLoading && !query.isFetched);

  // The vault list already carries each vault's APY, and the per-vault queries
  // only refine it — so the card can show a number as soon as the list lands
  // and let the live values replace it in place. Waiting for all of them held
  // the skeleton up for an extra round trip per vault, one after the list, to
  // arrive at a figure we were already holding.
  //
  // The refinement is still worth blocking on when the list gave us nothing:
  // there is no number to show yet, and "-" followed by a value reads worse
  // than a skeleton that resolves once.
  return {
    highestApy,
    isLoading: vaultsPending || (highestApy === null && apyPending),
  };
}
