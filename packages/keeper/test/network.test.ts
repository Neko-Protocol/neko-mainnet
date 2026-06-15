import { describe, it, expect } from "vitest";
import { defindexNetworkFromString } from "../src/index.js";

describe("defindexNetworkFromString", () => {
  it("returns a supported network for PUBLIC", () => {
    expect(defindexNetworkFromString("PUBLIC")).not.toBeNull();
  });

  it("returns a supported network for MAINNET", () => {
    expect(defindexNetworkFromString("MAINNET")).not.toBeNull();
  });

  it("returns a supported network for TESTNET", () => {
    expect(defindexNetworkFromString("TESTNET")).not.toBeNull();
  });

  it("returns null for nonsense", () => {
    expect(defindexNetworkFromString("nonsense-asdf")).toBeNull();
  });

  it("returns null for null/undefined", () => {
    expect(defindexNetworkFromString(null)).toBeNull();
    expect(defindexNetworkFromString(undefined)).toBeNull();
  });
});
