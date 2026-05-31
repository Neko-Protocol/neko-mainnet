import { describe, it, expect } from "vitest";
import { BlendPoolAdapter } from "../src/adapters/BlendPoolAdapter.js";
import {
  getBlendPoolIds,
  BLEND_VAULT_ONLY_RESERVES,
} from "../src/adapters/blend-config.js";
import type { OrchestratorConfig } from "../src/config.js";

const cfg: OrchestratorConfig = {
  network: { id: "PUBLIC", rpcUrl: "x", passphrase: "y" },
  contractToCodeMap: {},
};

describe("blend-config", () => {
  it("returns mainnet pool ids for PUBLIC", () => {
    const ids = getBlendPoolIds("PUBLIC");
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => typeof id === "string" && id.length === 56)).toBe(
      true
    );
  });

  it("returns testnet pool ids for TESTNET", () => {
    expect(getBlendPoolIds("TESTNET").length).toBeGreaterThan(0);
  });

  it("BLEND_VAULT_ONLY_RESERVES is a Set", () => {
    expect(BLEND_VAULT_ONLY_RESERVES).toBeInstanceOf(Set);
  });
});

describe("BlendPoolAdapter", () => {
  it("has type 'blend' and supports expected actions", () => {
    const a = new BlendPoolAdapter("pool", cfg);
    expect(a.type).toBe("blend");
    expect(a.supportsAction("deposit")).toBe(true);
    expect(a.supportsAction("withdraw")).toBe(true);
    expect(a.supportsAction("claimRewards")).toBe(true);
    expect(a.supportsAction("borrow")).toBe(true);
  });
});
