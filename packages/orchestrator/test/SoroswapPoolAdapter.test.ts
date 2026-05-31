import { describe, it, expect } from "vitest";
import { SoroswapPoolAdapter } from "../src/adapters/SoroswapPoolAdapter.js";
import type { OrchestratorConfig } from "../src/config.js";

const cfg: OrchestratorConfig = {
  network: { id: "PUBLIC", rpcUrl: "x", passphrase: "y" },
  contractToCodeMap: {},
};

describe("SoroswapPoolAdapter", () => {
  it("declares soroswap type", () => {
    expect(new SoroswapPoolAdapter(cfg).type).toBe("soroswap");
  });

  it("only supports deposit and withdraw", () => {
    const a = new SoroswapPoolAdapter(cfg);
    expect(a.supportsAction("deposit")).toBe(true);
    expect(a.supportsAction("withdraw")).toBe(true);
    expect(a.supportsAction("claimRewards")).toBe(false);
  });
});
