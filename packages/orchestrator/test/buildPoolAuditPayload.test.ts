import { describe, it, expect } from "vitest";
import { buildPoolAuditPayload } from "../src/utils/buildPoolAuditPayload.js";
import type { PoolActionParams } from "../src/types/pool.types.js";

describe("buildPoolAuditPayload", () => {
  it("returns null when no audit context", () => {
    const out = buildPoolAuditPayload(
      {
        poolId: "x",
        action: "deposit",
        amount: 1n,
      } as PoolActionParams,
      "h",
      "G"
    );
    expect(out).toBeNull();
  });

  it("emits a payload for a deposit", () => {
    const out = buildPoolAuditPayload(
      {
        poolId: "blend:x",
        action: "deposit",
        amount: 100_0000000n,
        audit: {
          tokens: [
            {
              address: "C",
              code: "USDC",
              name: "USDC",
              decimals: 7,
            },
          ],
          poolType: "blend",
          metadata: {},
        },
      } as PoolActionParams,
      "hash",
      "Gwallet"
    );
    expect(out).not.toBeNull();
    expect(out?.pool_id).toBe("blend:x");
    expect(out?.tx_hash).toBe("hash");
    expect(out?.wallet_address).toBe("Gwallet");
  });
});
