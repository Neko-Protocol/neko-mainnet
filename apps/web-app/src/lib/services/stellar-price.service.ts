import {
  getApiKey,
  getSDKNetwork,
  getSoroswapSDK,
} from "@/lib/helpers/stellar/soroswap/utils";
import {
  getCoinGeckoIdForToken,
  getReflectorAssetForToken,
} from "@/lib/constants/assets.config";
import type { Asset as ReflectorAsset } from "@neko/reflector";
import { getReflectorClient } from "@/lib/helpers/stellar/reflector-client";

/** Decimals used by the Reflector oracle (fixed at 14). */
const REFLECTOR_DECIMALS = 14;

function soroswapAssetMatches(
  apiAsset: string | undefined,
  contractAddress: string
): boolean {
  if (typeof apiAsset !== "string" || !apiAsset.length) return false;
  if (apiAsset === contractAddress) return true;
  if (apiAsset.length === contractAddress.length) {
    return apiAsset.toUpperCase() === contractAddress.toUpperCase();
  }
  return false;
}

function positiveUsdFromUnknown(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  return 0;
}

/**
 * Soroswap SDK `getPrice()` returns `PriceData[]`: `{ asset, price, timestamp }[]`.
 * Some responses may still be a keyed map or wrapped in `data` / `prices`.
 */
function parseSoroswapPricePayload(
  raw: unknown,
  contractAddress: string
): number {
  if (raw == null) return 0;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  if (typeof raw === "string") {
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  if (typeof raw !== "object") return 0;

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const asset = row.asset;
      if (
        !soroswapAssetMatches(
          typeof asset === "string" ? asset : "",
          contractAddress
        )
      ) {
        continue;
      }
      const p = positiveUsdFromUnknown(row.price);
      if (p > 0) return p;
    }
    // Single-asset GET: API may return one row with a non-matching `asset` label but valid `price`.
    if (raw.length === 1) {
      const row = raw[0] as Record<string, unknown>;
      const p = positiveUsdFromUnknown(row.price);
      if (p > 0) return p;
    }
    return 0;
  }

  const o = raw as Record<string, unknown>;

  if (
    typeof o.asset === "string" &&
    soroswapAssetMatches(o.asset, contractAddress)
  ) {
    const p = positiveUsdFromUnknown(o.price);
    if (p > 0) return p;
  }

  const direct = o[contractAddress];
  if (typeof direct === "number" && direct > 0) return direct;
  if (typeof direct === "string") {
    const n = parseFloat(direct);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  if (o.prices && typeof o.prices === "object") {
    return parseSoroswapPricePayload(o.prices, contractAddress);
  }
  if (o.data && typeof o.data === "object") {
    return parseSoroswapPricePayload(o.data, contractAddress);
  }
  for (const v of Object.values(o)) {
    if (!v || typeof v !== "object") continue;
    if (!Array.isArray(v) && "asset" in v && "price" in v) {
      const row = v as Record<string, unknown>;
      if (
        typeof row.asset === "string" &&
        soroswapAssetMatches(row.asset, contractAddress)
      ) {
        const p = positiveUsdFromUnknown(row.price);
        if (p > 0) return p;
      }
      continue;
    }
    const n = parseSoroswapPricePayload(v, contractAddress);
    if (n > 0) return n;
  }
  return 0;
}

/**
 * Price feeds in priority order (mainnet):
 *  1. Reflector oracle (on-chain, SEP-40) — for supported assets
 *  2. Soroswap DEX spot price
 *  3. CoinGecko off-chain fallback
 *
 * USDC is the Reflector base asset → always returns 1.00 on mainnet.
 * On testnet/standalone the Reflector client is null, so the chain falls
 * through to Soroswap → CoinGecko as before.
 */
export class StellarPriceService {
  async getCoinGeckoSimpleUsd(coinGeckoId: string): Promise<number> {
    const id = coinGeckoId.trim();
    if (!id) return 0;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12_000);
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (!res.ok) return 0;
      const data = (await res.json()) as Record<
        string,
        { usd?: number } | undefined
      >;
      const usd = data[id]?.usd;
      return typeof usd === "number" && usd > 0 ? usd : 0;
    } catch {
      return 0;
    }
  }

  async getSoroswapUsdPrice(contractAddress: string): Promise<number> {
    if (
      !contractAddress ||
      !contractAddress.startsWith("C") ||
      contractAddress.length !== 56
    ) {
      return 0;
    }
    try {
      const apiKey = getApiKey();
      if (!apiKey) return 0;
      const sdk = getSoroswapSDK();
      const network = getSDKNetwork();
      const raw = await sdk.getPrice(contractAddress, network);
      return parseSoroswapPricePayload(raw, contractAddress);
    } catch {
      return 0;
    }
  }

  async getReflectorUsdPrice(reflectorAsset: {
    tag: "Stellar" | "Other";
    value: string;
  }): Promise<number> {
    const client = getReflectorClient();
    if (!client) return 0;
    try {
      const asset: ReflectorAsset =
        reflectorAsset.tag === "Stellar"
          ? { tag: "Stellar", values: [reflectorAsset.value] as const }
          : { tag: "Other", values: [reflectorAsset.value] as const };

      const tx = await client.lastprice({ asset });
      const priceData = tx.result;
      if (!priceData) return 0;

      // Reflector prices have REFLECTOR_DECIMALS decimal places, quoted in USDC ≈ USD
      const usd = Number(priceData.price) / Math.pow(10, REFLECTOR_DECIMALS);
      return Number.isFinite(usd) && usd > 0 ? usd : 0;
    } catch {
      return 0;
    }
  }

  async getPrice(tokenCode: string, contractAddress?: string): Promise<number> {
    if (!tokenCode || typeof tokenCode !== "string") return 0;

    const reflectorAsset = getReflectorAssetForToken(tokenCode);
    const coinGeckoId = getCoinGeckoIdForToken(tokenCode);

    // Try Reflector first for all assets that have a reflectorAsset configured
    if (reflectorAsset) {
      const reflectorPrice = await this.getReflectorUsdPrice(reflectorAsset);
      if (reflectorPrice > 0) return reflectorPrice;
    }

    // XLM fallback: CoinGecko (Soroswap XLM price is in XLM, not USD)
    if (tokenCode === "XLM") {
      return this.getCoinGeckoSimpleUsd(coinGeckoId ?? "stellar");
    }

    // All other assets: Soroswap → CoinGecko
    if (contractAddress) {
      const spot = await this.getSoroswapUsdPrice(contractAddress);
      if (spot > 0) return spot;
      if (coinGeckoId) {
        return this.getCoinGeckoSimpleUsd(coinGeckoId);
      }
      return 0;
    }

    return 0;
  }
}

export const stellarPriceService = new StellarPriceService();
