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

const VAULT_FETCH_CONCURRENCY = 2;
const BATCH_GAP_MS = 350;

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
  let msg = "";
  let statusCode: number | undefined;
  if (err instanceof Error) {
    msg = err.message;
  } else if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string") msg = o.message;
    else if (typeof o.error === "string") msg = o.error;
    if (typeof o.statusCode === "number") statusCode = o.statusCode;
    if (typeof o.status === "number" && statusCode === undefined) {
      statusCode = o.status;
    }
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

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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

export async function fetchDefindexVaultViews(): Promise<VaultView[]> {
  const network = defindexNetworkFromEnv();
  if (!network) return [];

  const ids = parseDefindexVaultIds();
  if (ids.length === 0) return [];

  if (!getDefindexApiKeyFromEnv()) return [];

  const sdk = createDefindexServerSdk();
  const vaults: VaultView[] = [];
  const assetsConfig = Object.values(getAssetsConfig());

  const priceResults = await Promise.allSettled(
    assetsConfig.map((a) =>
      stellarPriceService
        .getPriceWithSource(a.code, a.contract)
        .then(({ price }) => ({ contract: a.contract, price }))
    )
  );

  const priceUsdByAsset: Record<string, number> = {};
  for (const r of priceResults) {
    if (r.status === "fulfilled" && r.value.price > 0) {
      priceUsdByAsset[r.value.contract] = r.value.price;
    }
  }

  const batchCount = Math.ceil(ids.length / VAULT_FETCH_CONCURRENCY);
  for (let bi = 0; bi < batchCount; bi++) {
    if (bi > 0) await delay(bi * BATCH_GAP_MS);
    const batch = ids.slice(
      bi * VAULT_FETCH_CONCURRENCY,
      (bi + 1) * VAULT_FETCH_CONCURRENCY
    );
    const batchSettled = await Promise.allSettled(
      batch.map((contractId) => fetchVaultInfo(sdk, contractId, network))
    );
    batchSettled.forEach((result, j) => {
      const contractId = batch[j]!;
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
          console.warn(
            "[fetchDefindexVaultViews]",
            contractId,
            formatVaultFetchError(err)
          );
        }
      }
    });
  }

  return vaults;
}
