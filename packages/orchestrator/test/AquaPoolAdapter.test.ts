import { describe, it, expect } from "vitest";
import { AquaPoolAdapter } from "../src/adapters/AquaPoolAdapter.js";
import {
  AQUA_API_BASE,
  getAquaPoolAddresses,
} from "../src/adapters/aqua-config.js";
import type { OrchestratorConfig } from "../src/config.js";

const cfg: OrchestratorConfig = {
  network: { id: "PUBLIC", rpcUrl: "x", passphrase: "y" },
  contractToCodeMap: {},
};

describe("AquaPoolAdapter", () => {
  it("declares aqua type", () => {
    expect(new AquaPoolAdapter(cfg).type).toBe("aqua");
  });

  it("supports deposit/withdraw/claimRewards", () => {
    const a = new AquaPoolAdapter(cfg);
    expect(a.supportsAction("deposit")).toBe(true);
    expect(a.supportsAction("withdraw")).toBe(true);
    expect(a.supportsAction("claimRewards")).toBe(true);
  });

  it("exposes a non-empty AQUA_API_BASE", () => {
    expect(AQUA_API_BASE).toMatch(/^https?:\/\//);
  });

  it("returns at least one Aqua pool address", () => {
    expect(getAquaPoolAddresses().length).toBeGreaterThan(0);
  });
});
