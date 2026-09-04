import { describe, it, expect } from "vitest";
import {
  getAssetsConfig,
  getCurrentNetworkId,
  getCoinGeckoIdForToken,
  getContractToCodeMap,
  getReflectorAssetForToken,
  getRwaTokenCodes,
  getStablecoinCodes,
  getTokenIconMap,
  type NetworkId,
} from "../src/index.js";

describe("assets config (parameterized)", () => {
  it("normalizes stellarNetwork strings to a NetworkId", () => {
    expect(getCurrentNetworkId("PUBLIC")).toBe<NetworkId>("mainnet");
    expect(getCurrentNetworkId("mainnet")).toBe<NetworkId>("mainnet");
    expect(getCurrentNetworkId("TESTNET")).toBe<NetworkId>("testnet");
    expect(getCurrentNetworkId("LOCAL")).toBe<NetworkId>("standalone");
    expect(getCurrentNetworkId("standalone")).toBe<NetworkId>("standalone");
    expect(getCurrentNetworkId(undefined)).toBe<NetworkId>("testnet");
  });

  it("returns mainnet asset set when given mainnet", () => {
    const networkId: NetworkId = getCurrentNetworkId("PUBLIC");
    const cfg = getAssetsConfig(networkId);
    expect(Object.keys(cfg).length).toBeGreaterThan(0);
    expect(cfg.USDC).toBeDefined();
    expect(cfg.USDT0).toMatchObject({
      contract: "CBSJZEIO5C7KC2SF3MKSNXXJSW5G3VTNBX4ATMKUI3B2MR4JKM4R26YF",
      decimals: 7,
      isStablecoin: true,
      isSwappable: false,
    });
    expect(cfg.XLM?.reflectorAsset?.tag).toBe("Stellar");
  });

  it("returns standalone asset set when given LOCAL", () => {
    const networkId: NetworkId = getCurrentNetworkId("LOCAL");
    const cfg = getAssetsConfig(networkId);
    expect(Object.keys(cfg).length).toBeGreaterThan(0);
  });

  it("returns testnet asset set when given testnet", () => {
    const networkId: NetworkId = getCurrentNetworkId("TESTNET");
    const cfg = getAssetsConfig(networkId);
    // testnet is intentionally empty in the registry, but the call should not throw
    expect(cfg).toBeDefined();
  });

  it("derives helpers from the same registry", () => {
    const networkId = getCurrentNetworkId("mainnet");
    expect(getCoinGeckoIdForToken(networkId, "XLM")).toBe("stellar");
    expect(getReflectorAssetForToken(networkId, "USDC")?.tag).toBe("Stellar");
    expect(getRwaTokenCodes(networkId)).toContain("CETES");
    expect(getStablecoinCodes(networkId)).toContain("USDC");
    expect(getStablecoinCodes(networkId)).toContain("USDT0");
    expect(getTokenIconMap(networkId).XLM).toMatch(/xlm/i);
    const contractMap = getContractToCodeMap(networkId);
    expect(Object.values(contractMap)).toContain("XLM");
  });
});
