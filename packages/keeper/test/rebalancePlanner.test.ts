import { describe, it, expect } from "vitest";
import {
  planVaultRebalance,
  REBALANCE_THRESHOLD_STROOPS,
} from "../src/index.js";
import type { VaultRebalanceConfig } from "../src/index.js";

describe("planVaultRebalance", () => {
  it("exposes the rebalance threshold constant", () => {
    expect(typeof REBALANCE_THRESHOLD_STROOPS).toBe("bigint");
    expect(REBALANCE_THRESHOLD_STROOPS).toBeGreaterThan(0n);
  });
  it("returns a plan structure for an empty funds entry", () => {
    const cfg: VaultRebalanceConfig = {
      vaultId: "CTEST...",
      label: "test",
      strategies: [
        { name: "blend-a", address: "CSTRATA...", targetBps: 10000 },
      ],
    };
    const result = planVaultRebalance(cfg, []);
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });
});
