import { describe, it, expect } from "vitest";
import { PoolRegistry } from "../src/core/PoolRegistry.js";
import { PoolNotFoundError } from "../src/types/errors.js";
import type { BasePoolAdapter } from "../src/types/adapter.types.js";
import type { PoolType } from "../src/types/pool.types.js";

function makeAdapter(type: PoolType): BasePoolAdapter {
  return {
    type,
    async getPoolInfo() {
      throw new Error("nope");
    },
    async listPools() {
      return [];
    },
    async getUserPosition() {
      throw new Error("nope");
    },
    async deposit() {
      throw new Error("nope");
    },
    async withdraw() {
      throw new Error("nope");
    },
    async claimRewards() {
      throw new Error("nope");
    },
    supportsAction() {
      return false;
    },
  };
}

describe("PoolRegistry", () => {
  it("resolves by explicit pool id mapping", () => {
    const reg = new PoolRegistry();
    const a = makeAdapter("blend");
    reg.register(a);
    reg.registerPool("custom-id", "blend");
    expect(reg.resolve("custom-id")).toBe(a);
  });
  it("resolves by 'type:rawId' prefix", () => {
    const reg = new PoolRegistry();
    const a = makeAdapter("soroswap");
    reg.register(a);
    expect(reg.resolve("soroswap:XLM-USDC")).toBe(a);
  });
  it("throws PoolNotFoundError when no adapter matches", () => {
    const reg = new PoolRegistry();
    expect(() => reg.resolve("xxx:y")).toThrow(PoolNotFoundError);
  });
  it("stripPrefix removes the type prefix", () => {
    expect(PoolRegistry.stripPrefix("blend:abc:def")).toBe("abc:def");
    expect(PoolRegistry.stripPrefix("noprefix")).toBe("noprefix");
  });
});
