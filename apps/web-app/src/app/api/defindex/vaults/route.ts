import { NextResponse } from "next/server";
import type DefindexSDK from "@defindex/sdk";
import type { SupportedNetworks, VaultInfoResponse } from "@defindex/sdk";
import { createDefindexServerSdk } from "@/lib/defindex/createServerSdk";
import { defindexInfoToVaultView } from "@/lib/defindex/mapToVaultView";
import { defindexNetworkFromEnv } from "@/lib/defindex/network";
import { getDefindexApiKeyFromEnv } from "@/lib/defindex/env";
import { parseDefindexVaultIds } from "@/lib/defindex/vaultIds";
import { stellarPriceService } from "@/lib/services/stellar-price.service";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import type { VaultView } from "@/features/shared/vault/types/vault";

export const dynamic = "force-dynamic";

const SERVER_CACHE_TTL_MS = 30_000;
let serverCache: {
  data: {
    vaults: VaultView[];
    fetchErrors?: { contractId: string; message: string }[];
  };
  ts: number;
} | null = null;

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
  // The DeFindex SDK rejects with the raw API response body
  // (e.g. { message: "Rate limit exceeded", statusCode: 429 }), not an Error
  // instance, so extract message + statusCode defensively.
  let msg = "";
  let statusCode: number | undefined;
  if (err instanceof Error) {
    msg = err.message;
  } else if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string") msg = o.message;
    else if (typeof o.error === "string") msg = o.error;
    if (typeof o.statusCode === "number") statusCode = o.statusCode;
    if (typeof o.status === "number" && statusCode === undefined)
      statusCode = o.status;
  } else {
    msg = String(err ?? "");
  }
  const lower = msg.toLowerCase();
  return (
    statusCode === 429 ||
    lower.includes("rate limit") ||
    lower.includes("429") ||
    lower.includes("too many")
  );
}

// DeFindex API rate-limits aggressive parallel calls. Keep concurrency low and
// batches well-spaced so we don't poison the response with partial failures.
const VAULT_FETCH_CONCURRENCY = 2;
const BATCH_GAP_MS = 350;

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Fetches a single vault with up to `maxRetries` retries on rate-limit errors.
async function fetchVaultInfo(
  sdk: InstanceType<typeof DefindexSDK>,
  contractId: string,
  network: SupportedNetworks,
  maxRetries = 5
): Promise<{ contractId: string; info: VaultInfoResponse }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const info = await sdk.getVaultInfo(contractId, network);
      return { contractId, info };
    } catch (err) {
      if (isRateLimitError(err) && attempt < maxRetries) {
        // Exponential backoff with jitter: ~800ms, 1.6s, 3.2s, 6.4s, 12.8s.
        const base = 800 * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 200);
        await delay(base + jitter);
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

  if (serverCache && Date.now() - serverCache.ts < SERVER_CACHE_TTL_MS) {
    return NextResponse.json(serverCache.data);
  }

  const sdk = createDefindexServerSdk();
  const vaults: VaultView[] = [];
  const fetchErrors: { contractId: string; message: string }[] = [];

  const assetsConfig = Object.values(getAssetsConfig());

  const pricePromise = Promise.allSettled(
    assetsConfig.map((a) =>
      stellarPriceService
        .getPriceWithSource(a.code, a.contract)
        .then(({ price }) => ({ contract: a.contract, price }))
    )
  );

  const batchCount = Math.ceil(ids.length / VAULT_FETCH_CONCURRENCY);
  const batchPromises = Array.from({ length: batchCount }, async (_, bi) => {
    if (bi > 0) await delay(bi * BATCH_GAP_MS);
    const batch = ids.slice(
      bi * VAULT_FETCH_CONCURRENCY,
      (bi + 1) * VAULT_FETCH_CONCURRENCY
    );
    return Promise.allSettled(
      batch.map((contractId) => fetchVaultInfo(sdk, contractId, network))
    );
  });

  const [priceResults, ...batchResults] = await Promise.all([
    pricePromise,
    ...batchPromises,
  ]);

  const priceUsdByAsset: Record<string, number> = {};
  for (const r of priceResults) {
    if (r.status === "fulfilled" && r.value.price > 0) {
      priceUsdByAsset[r.value.contract] = r.value.price;
    }
  }

  for (let bi = 0; bi < batchResults.length; bi++) {
    const batchSettled = batchResults[bi] as PromiseSettledResult<{
      contractId: string;
      info: VaultInfoResponse;
    }>[];
    const batchIds = ids.slice(
      bi * VAULT_FETCH_CONCURRENCY,
      (bi + 1) * VAULT_FETCH_CONCURRENCY
    );
    batchSettled.forEach((result, j) => {
      const contractId = batchIds[j]!;
      if (result.status === "fulfilled") {
        try {
          vaults.push(
            defindexInfoToVaultView(
              contractId,
              result.value.info,
              priceUsdByAsset
            )
          );
        } catch (err) {
          fetchErrors.push({ contractId, message: formatVaultFetchError(err) });
        }
      } else {
        fetchErrors.push({
          contractId,
          message: formatVaultFetchError(result.reason),
        });
      }
    });
  }

  const responseData = {
    vaults,
    ...(fetchErrors.length > 0 ? { fetchErrors } : {}),
  };
  // Only cache fully-successful responses. A partial failure (typically a
  // DeFindex rate limit on one vault) would otherwise pin a broken response
  // for SERVER_CACHE_TTL_MS and hide vaults from the UI until it expires.
  if (fetchErrors.length === 0) {
    serverCache = { data: responseData, ts: Date.now() };
  }

  return NextResponse.json(responseData);
}
