import { describe, it, expect } from "vitest";
import {
  StellarPriceService,
  type AssetConfig,
  type StellarPriceServiceDeps,
} from "../src/index.js";

const xlmConfig: AssetConfig = {
  code: "XLM",
  name: "Stellar Lumens",
  contract: "",
  decimals: 7,
  icon: "",
  priceSource: "coingecko",
  coinGeckoId: "stellar",
};

function makeDeps(
  overrides: Partial<StellarPriceServiceDeps> = {}
): StellarPriceServiceDeps {
  return {
    getSwapKitUsdPrice: async () => 0,
    getReflectorClient: () => null,
    getAssetConfig: () => undefined,
    ...overrides,
  };
}

describe("StellarPriceService", () => {
  it("constructs cleanly with a no-op deps bag", () => {
    const svc = new StellarPriceService(makeDeps());
    expect(svc).toBeDefined();
  });

  it("returns the Reflector base price for USDC without invoking any dep", async () => {
    let assetLookups = 0;
    const svc = new StellarPriceService(
      makeDeps({
        getAssetConfig: () => {
          assetLookups++;
          return undefined;
        },
      })
    );
    const result = await svc.getPriceWithSource("USDC");
    expect(result).toEqual({ price: 1, source: "reflector" });
    // USDC short-circuit doesn't even consult the asset config
    expect(assetLookups).toBe(0);
  });

  it("falls through to { price: 0, source: null } for an unknown token", async () => {
    const svc = new StellarPriceService(makeDeps());
    const result = await svc.getPriceWithSource("UNKNOWN");
    expect(result).toEqual({ price: 0, source: null });
  });

  it("ignores empty/invalid token codes", async () => {
    const svc = new StellarPriceService(makeDeps());
    expect(await svc.getPriceWithSource("")).toEqual({
      price: 0,
      source: null,
    });
  });

  describe("in-memory TTL cache", () => {
    it("returns cached price on a repeat call within the TTL window without hitting deps again", async () => {
      let geckoCalls = 0;
      const svc = new StellarPriceService(
        makeDeps({
          getAssetConfig: () => xlmConfig,
        })
      );
      // Stub fetch for CoinGecko
      const realFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        geckoCalls++;
        return new Response(JSON.stringify({ stellar: { usd: 0.12 } }), {
          status: 200,
        });
      }) as typeof fetch;
      try {
        const a = await svc.getPriceWithSource("XLM");
        const b = await svc.getPriceWithSource("XLM");
        expect(a).toEqual({ price: 0.12, source: "coingecko" });
        expect(b).toEqual({ price: 0.12, source: "coingecko" });
        expect(geckoCalls).toBe(1);
      } finally {
        globalThis.fetch = realFetch;
      }
    });

    it("re-fetches after the TTL expires", async () => {
      let geckoCalls = 0;
      const svc = new StellarPriceService(
        makeDeps({
          getAssetConfig: () => xlmConfig,
        }),
        { cacheTtlMs: 10 }
      );
      const realFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        geckoCalls++;
        return new Response(JSON.stringify({ stellar: { usd: 0.12 } }), {
          status: 200,
        });
      }) as typeof fetch;
      try {
        await svc.getPriceWithSource("XLM");
        await new Promise((r) => setTimeout(r, 20));
        await svc.getPriceWithSource("XLM");
        expect(geckoCalls).toBe(2);
      } finally {
        globalThis.fetch = realFetch;
      }
    });

    it("does NOT cache failed lookups (price = 0) so the next call can retry", async () => {
      let geckoCalls = 0;
      const svc = new StellarPriceService(
        makeDeps({
          getAssetConfig: () => xlmConfig,
        })
      );
      const realFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        geckoCalls++;
        // First call returns no data → price 0
        if (geckoCalls === 1) {
          return new Response("{}", { status: 200 });
        }
        return new Response(JSON.stringify({ stellar: { usd: 0.12 } }), {
          status: 200,
        });
      }) as typeof fetch;
      try {
        const a = await svc.getPriceWithSource("XLM");
        const b = await svc.getPriceWithSource("XLM");
        expect(a).toEqual({ price: 0, source: null });
        expect(b).toEqual({ price: 0.12, source: "coingecko" });
        expect(geckoCalls).toBe(2);
      } finally {
        globalThis.fetch = realFetch;
      }
    });

    it("treats different (tokenCode, contractAddress) pairs as independent cache keys", async () => {
      let geckoCalls = 0;
      const svc = new StellarPriceService(
        makeDeps({
          getAssetConfig: () => xlmConfig,
        })
      );
      const realFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        geckoCalls++;
        return new Response(JSON.stringify({ stellar: { usd: 0.12 } }), {
          status: 200,
        });
      }) as typeof fetch;
      try {
        await svc.getPriceWithSource("XLM", "Cabc...");
        await svc.getPriceWithSource("XLM", "Cdef...");
        expect(geckoCalls).toBe(2);
      } finally {
        globalThis.fetch = realFetch;
      }
    });
  });
});
