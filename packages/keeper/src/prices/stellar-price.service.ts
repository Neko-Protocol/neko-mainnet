import type {
  Client as ReflectorClient,
  Asset as ReflectorClientAsset,
} from "@neko-protocol/reflector";
import type {
  AssetConfig,
  AssetPriceSource,
  ReflectorAsset,
} from "../assets/assets.config.js";

/** Decimals used by the Reflector oracle (fixed at 14). */
const REFLECTOR_DECIMALS = 14;

export type PriceSource = AssetPriceSource;

export interface PricedResult {
  price: number;
  source: PriceSource | null;
}

// Resolvers are lazy so the host controls construction order of networked
// clients (SDKs, oracles) and can swap them between calls.
export interface StellarPriceServiceDeps {
  getSwapKitUsdPrice: (
    contractAddress: string,
    decimals: number
  ) => Promise<number>;
  getReflectorClient: () => ReflectorClient | null;
  getAssetConfig: (tokenCode: string) => AssetConfig | undefined;
}

/**
 * Price feeds in priority order (mainnet):
 *  1. Reflector oracle (on-chain, SEP-40) — for supported assets
 *  2. xBull Swap route to USDC
 *  3. CoinGecko off-chain fallback
 *
 * USDC is the Reflector base asset → always returns 1.00 on mainnet.
 * On testnet/standalone the Reflector client is null, so the chain falls
 * through to xBull Swap → CoinGecko.
 */
const DEFAULT_CACHE_TTL_MS = 60_000;

export interface StellarPriceServiceOptions {
  /** TTL for successful price lookups. Defaults to 60s. Failed lookups are not cached. */
  cacheTtlMs?: number;
}

export class StellarPriceService {
  private readonly inflight = new Map<string, Promise<PricedResult>>();
  private readonly cache = new Map<
    string,
    { result: PricedResult; expiresAt: number }
  >();
  private readonly cacheTtlMs: number;

  constructor(
    private readonly deps: StellarPriceServiceDeps,
    options: StellarPriceServiceOptions = {}
  ) {
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  }

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

  async getSwapKitUsdPrice(
    contractAddress: string,
    decimals: number
  ): Promise<number> {
    if (
      !contractAddress ||
      !contractAddress.startsWith("C") ||
      contractAddress.length !== 56
    ) {
      return 0;
    }
    try {
      return await this.deps.getSwapKitUsdPrice(contractAddress, decimals);
    } catch {
      return 0;
    }
  }

  async getReflectorUsdPrice(reflectorAsset: ReflectorAsset): Promise<number> {
    const client = this.deps.getReflectorClient();
    if (!client) return 0;
    try {
      const asset: ReflectorClientAsset =
        reflectorAsset.tag === "Stellar"
          ? { tag: "Stellar", values: [reflectorAsset.value] as const }
          : { tag: "Other", values: [reflectorAsset.value] as const };

      const tx = await client.lastprice({ asset });
      const priceData = tx.result;
      if (!priceData) return 0;

      // Reflector prices have REFLECTOR_DECIMALS decimal places, quoted in USDC ≈ USD
      const usd = Number(priceData.price) / Math.pow(10, REFLECTOR_DECIMALS);
      return Number.isFinite(usd) && usd > 0 ? usd : 0;
    } catch (err) {
      console.warn(
        "[Reflector] Last price fetch failed",
        reflectorAsset,
        err instanceof Error ? err.message : err
      );
      return 0;
    }
  }

  async getPrice(tokenCode: string, contractAddress?: string): Promise<number> {
    const { price } = await this.getPriceWithSource(tokenCode, contractAddress);
    return price;
  }

  async getPriceWithSource(
    tokenCode: string,
    contractAddress?: string
  ): Promise<PricedResult> {
    if (!tokenCode || typeof tokenCode !== "string") {
      return { price: 0, source: null };
    }
    const key = `${tokenCode}:${contractAddress ?? ""}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }
    const existing = this.inflight.get(key);
    if (existing) return existing;
    const promise = (async () => {
      try {
        const result = await this._fetchPriceWithSource(
          tokenCode,
          contractAddress
        );
        if (result.price > 0) {
          this.cache.set(key, {
            result,
            expiresAt: Date.now() + this.cacheTtlMs,
          });
        }
        return result;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, promise);
    return promise;
  }

  private async _fetchPriceWithSource(
    tokenCode: string,
    contractAddress?: string
  ): Promise<PricedResult> {
    if (!tokenCode || typeof tokenCode !== "string") {
      return { price: 0, source: null };
    }

    // USDC is the Reflector base asset — always 1:1 USD
    if (tokenCode === "USDC") {
      return { price: 1, source: "reflector" };
    }

    const config = this.deps.getAssetConfig(tokenCode);
    const reflectorAsset = config?.reflectorAsset;
    const coinGeckoId = config?.coinGeckoId;
    const preferredSource: AssetPriceSource | undefined = config?.priceSource;

    const sources: { key: AssetPriceSource; fetch: () => Promise<number> }[] = [
      {
        key: "reflector",
        fetch: () =>
          reflectorAsset
            ? this.getReflectorUsdPrice(reflectorAsset)
            : Promise.resolve(0),
      },
      {
        key: "swap-kit",
        fetch: () =>
          contractAddress
            ? this.getSwapKitUsdPrice(contractAddress, config?.decimals ?? 7)
            : Promise.resolve(0),
      },
      {
        key: "coingecko",
        fetch: () =>
          coinGeckoId
            ? this.getCoinGeckoSimpleUsd(coinGeckoId)
            : Promise.resolve(0),
      },
    ];

    const ordered = preferredSource
      ? [
          ...sources.filter((s) => s.key === preferredSource),
          ...sources.filter((s) => s.key !== preferredSource),
        ]
      : sources;

    for (const { key, fetch } of ordered) {
      const price = await fetch();
      if (price > 0) return { price, source: key };
    }

    return { price: 0, source: null };
  }
}
