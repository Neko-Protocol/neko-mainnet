"use client";

import { useQueries } from "@tanstack/react-query";
import { Client as DefindexVaultClient } from "@neko/defindex-vault";
import {
  rpcUrl,
  networkPassphrase,
  allowHttpForSoroban,
} from "@/lib/constants/network";
import { useWallet } from "@/hooks/useWallet";
import { useDefindexVaults } from "@/features/shared/vault/hooks/useDefindexVaults";
import type { VaultView } from "@/features/shared/vault/types/vault";

export interface VaultPositionEntry {
  vault: VaultView;
  userShares: bigint;
}

export function useDashboardVaultPositions() {
  const { address } = useWallet();
  const { data: vaultsPayload, isLoading: vaultsLoading } = useDefindexVaults();
  const vaults = vaultsPayload?.vaults ?? [];

  const balanceQueries = useQueries({
    queries: vaults.map((vault, i) => ({
      queryKey: ["vaultBalance", vault.id, address],
      queryFn: async (): Promise<bigint> => {
        if (!address) return 0n;
        // Stagger requests to avoid overwhelming the Soroban RPC endpoint
        if (i > 0) await new Promise((r) => setTimeout(r, i * 150));
        const client = new DefindexVaultClient({
          contractId: vault.id,
          rpcUrl,
          networkPassphrase,
          ...(allowHttpForSoroban && { allowHttp: true }),
        });
        const tx = await client.balance({ id: address }, { simulate: true });
        return BigInt(tx.result?.toString() ?? "0");
      },
      enabled: Boolean(address) && vaults.length > 0,
      staleTime: 2 * 60_000,
      refetchInterval: 3 * 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attempt: number) => attempt * 800,
      throwOnError: false,
    })),
  });

  const positions: VaultPositionEntry[] = [];
  balanceQueries.forEach((q, i) => {
    const shares = q.data ?? 0n;
    if (shares > 0n && vaults[i]) {
      positions.push({ vault: vaults[i], userShares: shares });
    }
  });

  const isLoading =
    vaultsLoading ||
    (vaults.length > 0 && balanceQueries.some((q) => q.isLoading));

  return {
    positions,
    isLoading,
    hasWallet: Boolean(address),
  };
}
