import type { PriceSource, PricedResult } from "@neko/keeper";
import { backendClient } from "@/lib/services/backend-client";

export type { PriceSource, PricedResult };

/**
 * Asset prices, resolved by the backend.
 *
 * The price chain — Reflector, then an xBull route, then CoinGecko — used to
 * run in the browser, so every visitor made their own call per asset from
 * their own IP. A Discover mount is fourteen cards at once, which the free
 * CoinGecko tier answers with 429, and an error response carries no CORS
 * headers so it surfaces as a CORS failure too.
 *
 * Running it server-side turns the cost from "users times assets" into
 * "assets times TTL": one upstream call per asset per window, shared by
 * everyone, cached in Redis. It also keeps a third-party host off the
 * browser's critical path.
 *
 * Calls made close together are coalesced into a single request, so the
 * fourteen cards cost one round trip rather than fourteen.
 */

/**
 * How long to wait before flushing a batch.
 *
 * React commits a page's cards together, so their queries start within the
 * same tick or two. This is long enough to catch that and short enough to be
 * invisible.
 */
const BATCH_WINDOW_MS = 20;

/** Mirrors MAX_SPOT_SYMBOLS on the backend; longer lists are split. */
const MAX_SYMBOLS_PER_REQUEST = 40;

const UNPRICED: PricedResult = { price: 0, source: null };

interface SpotResponse {
  data: Record<string, { price: number; source: string | null }>;
}

type Pending = {
  resolve: (result: PricedResult) => void;
  reject: (error: unknown) => void;
};

const queue = new Map<string, Pending[]>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function flush(): Promise<void> {
  flushTimer = null;
  const batch = new Map(queue);
  queue.clear();
  if (batch.size === 0) return;

  const symbols = [...batch.keys()];

  await Promise.all(
    chunk(symbols, MAX_SYMBOLS_PER_REQUEST).map(async (group) => {
      try {
        const response = await backendClient.get<SpotResponse>(
          `/v1/asset-prices/spot?symbols=${encodeURIComponent(group.join(","))}`
        );
        for (const symbol of group) {
          const entry = response.data?.[symbol];
          const result: PricedResult = entry
            ? {
                price: entry.price,
                // The backend returns the source it actually used; anything
                // unrecognised is reported as unsourced rather than coerced.
                source: (entry.source as PriceSource | null) ?? null,
              }
            : UNPRICED;
          for (const pending of batch.get(symbol) ?? [])
            pending.resolve(result);
        }
      } catch (err) {
        // A source that fails comes back as a zero price, not an exception, so
        // reaching here means the request itself failed. Reject so callers can
        // retry rather than caching a wrong zero.
        for (const symbol of group) {
          for (const pending of batch.get(symbol) ?? []) pending.reject(err);
        }
      }
    })
  );
}

function enqueue(symbol: string): Promise<PricedResult> {
  return new Promise<PricedResult>((resolve, reject) => {
    const waiting = queue.get(symbol);
    if (waiting) {
      waiting.push({ resolve, reject });
    } else {
      queue.set(symbol, [{ resolve, reject }]);
    }
    flushTimer ??= setTimeout(() => void flush(), BATCH_WINDOW_MS);
  });
}

export const stellarPriceService = {
  /**
   * The contract address is accepted for call-site compatibility and ignored:
   * the backend resolves it from the same asset catalogue, so sending it would
   * let a caller ask for a price against an address the catalogue disagrees
   * with.
   */
  async getPriceWithSource(
    tokenCode: string,
    _contractAddress?: string
  ): Promise<PricedResult> {
    const symbol = tokenCode?.trim().toUpperCase();
    if (!symbol) return UNPRICED;
    return enqueue(symbol);
  },

  async getPrice(tokenCode: string, contractAddress?: string): Promise<number> {
    const { price } = await this.getPriceWithSource(tokenCode, contractAddress);
    return price;
  },
};
