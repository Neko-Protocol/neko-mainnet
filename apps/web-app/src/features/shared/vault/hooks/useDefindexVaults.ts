"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { VaultView } from "../types/vault";

export type DefindexVaultsPayload = {
  vaults: VaultView[];
  error?: string;
  hint?: string;
  fetchErrors?: { contractId: string; message: string }[];
};

async function fetchDefindexVaults(): Promise<DefindexVaultsPayload> {
  const res = await fetch("/api/defindex/vaults");
  if (!res.ok) throw new Error("Failed to load vaults");
  const data = (await res.json()) as DefindexVaultsPayload;
  return {
    vaults: data.vaults ?? [],
    error: data.error,
    hint: data.hint,
    fetchErrors: data.fetchErrors,
  };
}

export function useDefindexVaults() {
  return useQuery({
    queryKey: ["defindex-vaults"],
    queryFn: fetchDefindexVaults,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}
