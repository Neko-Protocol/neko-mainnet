import {
  ETHERFUSE_BOND_SYMBOLS,
  FALLBACK_APY,
  FALLBACK_CURRENCY,
  type EtherfuseBondSymbol,
} from "../constants/etherfuseBonds";
import type { EtherfuseYieldEntry } from "../hooks/useEtherfuseYields";

/**
 * Resolved sovereign-bond APR and denomination for a bond symbol (CETES,
 * USTRY, etc.). Returns null if `symbol` is not an Etherfuse bond code.
 */
export function resolveEtherfuseBondApy(
  symbol: string,
  yieldsData: EtherfuseYieldEntry[] | undefined
): { apy: number; isFallback: boolean; bondCurrency: string } | null {
  const upper = symbol.toUpperCase();
  if (!(ETHERFUSE_BOND_SYMBOLS as readonly string[]).includes(upper)) {
    return null;
  }
  const bond = upper as EtherfuseBondSymbol;
  const entry = yieldsData?.find(
    (y) => y.symbol.toUpperCase() === bond.toUpperCase()
  );
  const apy =
    entry && typeof entry.apy === "number" && Number.isFinite(entry.apy)
      ? entry.apy
      : FALLBACK_APY[bond];
  const bondCurrency = entry?.currency?.trim() || FALLBACK_CURRENCY[bond];
  const isFallback = Boolean(
    !entry || typeof entry.apy !== "number" || !Number.isFinite(entry.apy)
  );
  return { apy, isFallback, bondCurrency };
}
