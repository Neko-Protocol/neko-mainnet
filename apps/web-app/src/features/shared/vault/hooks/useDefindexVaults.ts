"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import type { VaultInfoResponse } from "@defindex/sdk";
import { backendClient } from "@/lib/services/backend-client";
import {
  defindexInfoToVaultView,
  type MapperTranslator,
} from "@/features/shared/vault/utils/mapToVaultView";
import type { Locale } from "@/i18n/config";
import type { VaultView } from "../types/vault";

export type DefindexVaultsPayload = {
  vaults: VaultView[];
  error?: string;
  hint?: string;
  fetchErrors?: { contractId: string; message: string }[];
};

interface RawDefindexVaultsResponse {
  vaults: { contractId: string; info: VaultInfoResponse }[];
  prices: Record<string, number>;
  fetchErrors?: { contractId: string; message: string }[];
  error?: string;
  hint?: string;
}

async function fetchDefindexVaults(
  locale: Locale,
  t: MapperTranslator
): Promise<DefindexVaultsPayload> {
  const data = await backendClient.get<RawDefindexVaultsResponse>(
    "/v1/defindex/vaults"
  );

  const fetchErrors = data.fetchErrors ? [...data.fetchErrors] : [];
  const prices = data.prices ?? {};
  const vaults: VaultView[] = [];
  for (const { contractId, info } of data.vaults ?? []) {
    try {
      vaults.push(defindexInfoToVaultView(contractId, info, prices, locale, t));
    } catch (err) {
      fetchErrors.push({
        contractId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    vaults,
    error: data.error,
    hint: data.hint,
    fetchErrors: fetchErrors.length > 0 ? fetchErrors : undefined,
  };
}

export function useDefindexVaults() {
  const locale = useLocale() as Locale;
  const t = useTranslations("sharedVault.mapper") as MapperTranslator;
  return useQuery({
    queryKey: ["defindex-vaults", locale],
    queryFn: () => fetchDefindexVaults(locale, t),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}
