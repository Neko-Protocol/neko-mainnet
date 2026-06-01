import { describe, it, expect } from "vitest";
import {
  StellarPriceService,
  type StellarPriceServiceDeps,
} from "../src/index.js";

function makeDeps(
  overrides: Partial<StellarPriceServiceDeps> = {}
): StellarPriceServiceDeps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noopSdk: any = { getPrice: async () => [] };
  return {
    getSoroswapSDK: () => noopSdk,
    getSoroswapApiKey: () => undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSoroswapNetwork: () => "MAINNET" as any,
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
});
