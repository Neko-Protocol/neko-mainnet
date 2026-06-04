"use client";

import { useMemo } from "react";
import type { SavedStrategy } from "@/stores/strategies.store";
import type { SimulatorDestination } from "../types/simulator.types";

export type LiveApyInput = Pick<
  SavedStrategy,
  "token" | "destination" | "stackVenue"
>;
import { useVaultApy } from "@/features/shared/vault/hooks/useVaultApy";
import { useFilteredDestinations } from "./useFilteredDestinations";
import { useEtherfuseYields } from "./useEtherfuseYields";
import { resolveEtherfuseBondApy } from "../utils/etherfuseBondApy";

interface LiveStrategyApy {
  apy: number | null;
  isLoading: boolean;
}

function pickApy(
  needle: { id: string; kind: SimulatorDestination["kind"] } | undefined | null,
  pools: SimulatorDestination[],
  vaults: SimulatorDestination[],
  yieldTokens: SimulatorDestination[]
): number | null {
  if (!needle) return null;
  const haystack =
    needle.kind === "pool"
      ? pools
      : needle.kind === "vault"
        ? vaults
        : yieldTokens;
  const hit = haystack.find((d) => d.id === needle.id);
  const v = hit?.apy;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function useLiveStrategyApy(strategy: LiveApyInput): LiveStrategyApy {
  const {
    pools,
    vaults,
    yieldTokens,
    isLoading: destLoading,
  } = useFilteredDestinations(strategy.token);

  // Shared cached query (same key as useFilteredDestinations) — no extra fetch.
  const yieldsData = useEtherfuseYields().data;

  const destIsVault = strategy.destination.kind === "vault";
  const stackIsVault = strategy.stackVenue?.kind === "vault";

  // Vault APY comes from /api/vault/apy. Hook handles null id (disabled query).
  const vaultDestApi = useVaultApy(
    destIsVault ? strategy.destination.id : null
  );
  const vaultStackApi = useVaultApy(
    stackIsVault ? strategy.stackVenue!.id : null
  );

  const apy = useMemo(() => {
    function lendingFallbackFor(tokenCode: string): number | null {
      const match = pools.find(
        (p) =>
          typeof p.id === "string" &&
          p.id.startsWith("lending:") &&
          p.acceptedTokenCodes.includes(tokenCode) &&
          typeof p.apy === "number" &&
          Number.isFinite(p.apy)
      );
      return match?.apy ?? null;
    }

    let destApy: number | null = destIsVault
      ? vaultDestApi.vaultApy
      : pickApy(strategy.destination, pools, vaults, yieldTokens);

    if (destApy === null && destIsVault) {
      destApy = lendingFallbackFor(strategy.token.code);
    }

    let stackApy: number | null = null;
    if (strategy.stackVenue) {
      stackApy = stackIsVault
        ? vaultStackApi.vaultApy
        : pickApy(strategy.stackVenue, pools, vaults, yieldTokens);
      if (stackApy === null && stackIsVault) {
        stackApy = lendingFallbackFor(strategy.token.code);
      }
    }

    // Asset's own native yield (Etherfuse bonds only). A yield-bearing bond
    // keeps accruing while the principal sits in a pool/vault, so it stacks on
    // top. Skip when a leg is itself a yield-token of that same bond — the
    // "Bond hold" destination already represents the native yield (no double
    // count). Returns null for non-bond tokens.
    const destIsYieldToken = strategy.destination.kind === "yield-token";
    const stackIsYieldToken = strategy.stackVenue?.kind === "yield-token";
    const assetNativeApy =
      destIsYieldToken || stackIsYieldToken
        ? null
        : (resolveEtherfuseBondApy(strategy.token.code, yieldsData)?.apy ??
          null);

    // Total yield = destination + stacked venue + asset's native yield.
    const parts = [destApy, stackApy, assetNativeApy].filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v)
    );
    return parts.length > 0 ? parts.reduce((sum, v) => sum + v, 0) : null;
  }, [
    destIsVault,
    stackIsVault,
    vaultDestApi.vaultApy,
    vaultStackApi.vaultApy,
    strategy.token.code,
    strategy.destination,
    strategy.stackVenue,
    pools,
    vaults,
    yieldTokens,
    yieldsData,
  ]);

  const isLoading =
    destLoading ||
    (destIsVault && vaultDestApi.isLoading) ||
    (stackIsVault && vaultStackApi.isLoading);

  return { apy, isLoading };
}
