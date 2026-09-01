import type { VaultInfoResponse } from "@defindex/sdk";
import type { Locale } from "@/i18n/config";

/**
 * Shared by the hook and by the server prefetch, so both write the same cache
 * entry. If they drifted the page would fetch the catalogue twice and the
 * prefetch would silently stop helping.
 */
export const defindexVaultsKey = (locale: Locale) =>
  ["defindex-vaults", locale] as const;

export interface RawDefindexVaultsResponse {
  vaults: { contractId: string; info: VaultInfoResponse }[];
  prices: Record<string, number>;
  fetchErrors?: { contractId: string; message: string }[];
  error?: string;
  hint?: string;
}
