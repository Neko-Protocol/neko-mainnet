import { describe, it, expect } from "vitest";
import { createOrchestrator } from "../src/factory.js";

describe("createOrchestrator", () => {
  it("registers blend and aqua on PUBLIC", () => {
    const { poolRegistry } = createOrchestrator({
      network: { id: "PUBLIC", rpcUrl: "x", passphrase: "y" },
      contractToCodeMap: {},
    });
    const types = poolRegistry
      .getAdapters()
      .map((a) => a.type)
      .sort();
    expect(types).toContain("blend");
    expect(types).not.toContain("soroswap");
    expect(types).toContain("aqua");
  });
});
