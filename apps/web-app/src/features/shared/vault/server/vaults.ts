import "server-only";

import type { VaultInfoResponse } from "@defindex/sdk";
import {
  defindexInfoToVaultView,
  type MapperTranslator,
} from "@/features/shared/vault/utils/mapToVaultView";
import type { Locale } from "@/i18n/config";
import type { DefindexVaultsPayload } from "@/features/shared/vault/hooks/useDefindexVaults";
import type { RawDefindexVaultsResponse } from "../queryKeys";
import type { VaultView } from "../types/vault";

/**
 * The vault catalogue, fetched during the server render.
 *
 * Same shape and same query key as `useDefindexVaults`, so the page can hand
 * it to HydrationBoundary and the hook finds it already in the cache. The
 * client otherwise could not ask for it until its JavaScript had downloaded
 * and hydrated, and everything that reads a vault — the APY card among them —
 * waited behind that.
 *
 * It talks to the backend directly rather than through /api/backend-proxy:
 * the proxy exists to keep the internal key out of the browser, and on the
 * server that hop would only add latency to a request already holding the key.
 */
export async function getDefindexVaults(
  locale: Locale,
  t: MapperTranslator
): Promise<DefindexVaultsPayload | null> {
  const baseUrl = process.env.BACKEND_INTERNAL_URL?.replace(/\/+$/, "");
  const key = process.env.BACKEND_INTERNAL_KEY;
  if (!baseUrl || !key) return null;

  let data: RawDefindexVaultsResponse;
  try {
    const res = await fetch(`${baseUrl}/v1/defindex/vaults`, {
      headers: { "X-Internal-Key": key, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    data = (await res.json()) as RawDefindexVaultsResponse;
  } catch {
    // Returning null leaves the cache empty and the hook fetches as it always
    // did — a backend blip should cost the prefetch, not the page.
    return null;
  }

  const fetchErrors = data.fetchErrors ? [...data.fetchErrors] : [];
  const prices = data.prices ?? {};
  const vaults: VaultView[] = [];
  for (const { contractId, info } of data.vaults ?? []) {
    try {
      vaults.push(
        defindexInfoToVaultView(
          contractId,
          info as VaultInfoResponse,
          prices,
          locale,
          t
        )
      );
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
