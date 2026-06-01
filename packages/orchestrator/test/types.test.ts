import { describe, it, expect } from "vitest";
import {
  PoolNotFoundError,
  UnsupportedActionError,
  AdapterError,
  setContractErrorExtractor,
} from "../src/types";

describe("orchestrator errors", () => {
  it("PoolNotFoundError carries the poolId", () => {
    const e = new PoolNotFoundError("blend:x");
    expect(e.poolId).toBe("blend:x");
    expect(e.message).toContain("blend:x");
  });
  it("UnsupportedActionError reports adapter + action", () => {
    const e = new UnsupportedActionError("blend", "claimRewards");
    expect(e.adapterType).toBe("blend");
    expect(e.action).toBe("claimRewards");
  });
  it("AdapterError uses injected extractor", () => {
    setContractErrorExtractor(() => "boom");
    const e = new AdapterError("aqua", "deposit", new Error("raw"));
    expect(e.userMessage).toBe("boom");
    expect(e.message).toContain("[aqua] deposit failed: boom");
  });
  it("AdapterError falls back to String(cause) when no extractor", () => {
    setContractErrorExtractor(null);
    const e = new AdapterError("aqua", "deposit", "raw");
    expect(e.userMessage).toBe("raw");
  });
});
