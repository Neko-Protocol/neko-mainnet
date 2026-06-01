import { describe, it, expect } from "vitest";
import {
  parseDefindexVaultIds,
  parseAllVaultIds,
  BLEND_KEEPER_VAULT_IDS,
} from "../src/index.js";

describe("vault ids", () => {
  it("BLEND_KEEPER_VAULT_IDS is non-empty", () => {
    expect(BLEND_KEEPER_VAULT_IDS.length).toBeGreaterThan(0);
  });
  it("parseDefindexVaultIds returns an array", () => {
    expect(Array.isArray(parseDefindexVaultIds())).toBe(true);
  });
  it("parseAllVaultIds returns an array", () => {
    expect(Array.isArray(parseAllVaultIds())).toBe(true);
  });
});
