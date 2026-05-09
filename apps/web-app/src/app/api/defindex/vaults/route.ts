import { NextResponse } from "next/server";
import type DefindexSDK from "@defindex/sdk";
import type { SupportedNetworks } from "@defindex/sdk";
import { createDefindexServerSdk } from "@/lib/defindex/createServerSdk";
import { defindexInfoToVaultView } from "@/lib/defindex/mapToVaultView";
import { defindexNetworkFromEnv } from "@/lib/defindex/network";
import { getDefindexApiKeyFromEnv } from "@/lib/defindex/env";
import { parseDefindexVaultIds } from "@/lib/defindex/vaultIds";
import { stellarPriceService } from "@/lib/services/stellar-price.service";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import type { VaultView } from "@/features/shared/vault/types/vault";

export const dynamic = "force-dynamic";

function formatVaultFetchError(reason: unknown): string {
  if (reason && typeof reason === "object") {
    const o = reason as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (typeof o.error === "string") return o.error;
    try {
      return JSON.stringify(o);
    } catch {
      return "Unknown error";
    }
  }
  if (reason instanceof Error) return reason.message;
  return String(reason);
}

function isRateLimitError(err: unknown): boolean {
  const msg =
    err instanceof Error ? err.message : String(err ?? "").toLowerCase();
  return (
    msg.toLowerCase().includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("too many")
  );
}

const VAULT_FETCH_CONCURRENCY = 5;
const BATCH_GAP_MS = 50;

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Fetches a single vault with up to `maxRetries` retries on rate-limit errors.
async function fetchVaultWithRetry(
  sdk: InstanceType<typeof DefindexSDK>,
  contractId: string,
  network: SupportedNetworks,
  priceUsdByAsset: Record<string, number>,
  maxRetries = 3
): Promise<VaultView> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const info = await sdk.getVaultInfo(contractId, network);
      return defindexInfoToVaultView(contractId, info, priceUsdByAsset);
    } catch (err) {
      if (isRateLimitError(err) && attempt < maxRetries) {
        await delay(600 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function GET() {
  const network = defindexNetworkFromEnv();
  if (!network) {
    return NextResponse.json({
      vaults: [] as VaultView[],
      error: "unsupported_network",
    });
  }

  const ids = parseDefindexVaultIds();
  if (ids.length === 0) {
    return NextResponse.json({
      vaults: [] as VaultView[],
      error: "no_vault_ids",
      hint: "Set DEFINDEX_VAULT_IDS or NEXT_PUBLIC_DEFINDEX_VAULT_IDS with vault contract addresses.",
    });
  }

  const hasApiKey = Boolean(getDefindexApiKeyFromEnv());
  if (!hasApiKey) {
    return NextResponse.json({
      vaults: [] as VaultView[],
      error: "missing_defindex_api_key",
      hint: "Set DEFINDEX_API_KEY in apps/web-app/.env.local (server-only). The DeFindex HTTP API returns 403 without it.",
    });
  }

  const sdk = createDefindexServerSdk();
  const vaults: VaultView[] = [];
  const fetchErrors: { contractId: string; message: string }[] = [];

  // Fetch USD prices for all known assets once, so TVL shows real dollar value.
  const priceUsdByAsset: Record<string, number> = {};
  try {
    const assetsConfig = Object.values(getAssetsConfig());
    const prices = await Promise.allSettled(
      assetsConfig.map((a) =>
        stellarPriceService
          .getPriceWithSource(a.code, a.contract)
          .then(({ price }) => ({ contract: a.contract, price }))
      )
    );
    for (const r of prices) {
      if (r.status === "fulfilled" && r.value.price > 0) {
        priceUsdByAsset[r.value.contract] = r.value.price;
      }
    }
  } catch {
    // error fetching prices
  }

  for (let i = 0; i < ids.length; i += VAULT_FETCH_CONCURRENCY) {
    const batch = ids.slice(i, i + VAULT_FETCH_CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map((contractId) =>
        fetchVaultWithRetry(sdk, contractId, network, priceUsdByAsset)
      )
    );
    settled.forEach((result, j) => {
      const contractId = batch[j]!;
      if (result.status === "fulfilled") {
        vaults.push(result.value);
      } else {
        fetchErrors.push({
          contractId,
          message: formatVaultFetchError(result.reason),
        });
      }
    });
    if (i + VAULT_FETCH_CONCURRENCY < ids.length) {
      await delay(BATCH_GAP_MS);
    }
  }

  return NextResponse.json({
    vaults,
    ...(fetchErrors.length > 0 ? { fetchErrors } : {}),
  });
}
