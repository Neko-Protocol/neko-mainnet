import { describe, it, expect } from "vitest";
import {
  VAULT_REBALANCE_CONFIGS,
  getVaultRebalanceConfig,
  getConfiguredRebalanceVaultIds,
} from "../src/index.js";

describe("rebalanceConfig", () => {
  it("VAULT_REBALANCE_CONFIGS is non-empty", () => {
    expect(VAULT_REBALANCE_CONFIGS.length).toBeGreaterThan(0);
  });
  it("getConfiguredRebalanceVaultIds returns all vaultIds", () => {
    const ids = getConfiguredRebalanceVaultIds();
    expect(ids.length).toBe(VAULT_REBALANCE_CONFIGS.length);
  });
  it("getVaultRebalanceConfig returns config for known id", () => {
    const first = VAULT_REBALANCE_CONFIGS[0];
    expect(getVaultRebalanceConfig(first.vaultId)?.label).toBe(first.label);
  });
  it("returns undefined for unknown id", () => {
    expect(getVaultRebalanceConfig("CNOPE...")).toBeUndefined();
  });
});
