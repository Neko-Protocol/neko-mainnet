import {
  getApiKey,
  getSDKNetwork,
  getSoroswapSDK,
} from "@/lib/helpers/stellar/soroswap/utils";
import { getCoinGeckoIdForToken } from "@/lib/constants/assets.config";

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
      if (!soroswapAssetMatches(typeof asset === "string" ? asset : "", contractAddress)) {
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

  if (typeof o.asset === "string" && soroswapAssetMatches(o.asset, contractAddress)) {
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
      if (typeof row.asset === "string" && soroswapAssetMatches(row.asset, contractAddress)) {
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
 * USD spot: Soroswap first for SAC contracts; then optional CoinGecko id from
 * `assets.config` (`coinGeckoId`). XLM uses CoinGecko `stellar` (from config).
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

  async getPrice(tokenCode: string, contractAddress?: string): Promise<number> {
    if (!tokenCode || typeof tokenCode !== "string") return 0;

    const coinGeckoId = getCoinGeckoIdForToken(tokenCode);

    if (tokenCode === "XLM") {
      return this.getCoinGeckoSimpleUsd(coinGeckoId ?? "stellar");
    }

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
