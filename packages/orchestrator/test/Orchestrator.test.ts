import { describe, it, expect, vi } from "vitest";
import { Orchestrator } from "../src/core/Orchestrator.js";
import { PoolRegistry } from "../src/core/PoolRegistry.js";
import {
  UnsupportedActionError,
  PoolNotFoundError,
} from "../src/types/errors.js";
import type { BasePoolAdapter } from "../src/types/adapter.types.js";
import type {
  PoolInfo,
  PoolPosition,
  PoolType,
} from "../src/types/pool.types.js";

function stubAdapter(
  over: Partial<BasePoolAdapter> & { type?: PoolType } = {}
): BasePoolAdapter {
  const base: BasePoolAdapter = {
    type: "soroswap",
    getPoolInfo: vi.fn(
      async () =>
        ({
          id: "soroswap:x",
          type: "soroswap",
          name: "",
          tokens: [],
          tvl: 0n,
          apy: 0,
          state: "active",
          supportedActions: [],
          metadata: {},
        }) as PoolInfo
    ),
    listPools: vi.fn(async () => [] as PoolInfo[]),
    getUserPosition: vi.fn(
      async () =>
        ({
          poolId: "soroswap:x",
          deposited: 0n,
          depositedFormatted: "0",
          rewards: 0n,
          rewardsFormatted: "0",
          metadata: {},
        }) as PoolPosition
    ),
    deposit: vi.fn(async () => ({ xdr: "X", networkPassphrase: "P" })),
    withdraw: vi.fn(async () => ({ xdr: "X", networkPassphrase: "P" })),
    claimRewards: vi.fn(async () => ({ xdr: "X", networkPassphrase: "P" })),
    supportsAction: () => true,
  };
  return { ...base, ...over };
}

describe("Orchestrator", () => {
  it("throws PoolNotFoundError when no adapter resolves", async () => {
    const o = new Orchestrator(new PoolRegistry());
    await expect(o.getPoolInfo("ghost:x")).rejects.toBeInstanceOf(
      PoolNotFoundError
    );
  });

  it("delegates deposit to resolved adapter", async () => {
    const reg = new PoolRegistry();
    const adapter = stubAdapter();
    reg.register(adapter);
    await new Orchestrator(reg).deposit("soroswap:XLM-USDC", "G...", 100n);
    expect(adapter.deposit).toHaveBeenCalled();
  });

  it("throws UnsupportedActionError for borrow on non-supporting adapter", async () => {
    const reg = new PoolRegistry();
    reg.register(stubAdapter());
    await expect(
      new Orchestrator(reg).borrow("soroswap:x", "G", 1n)
    ).rejects.toBeInstanceOf(UnsupportedActionError);
  });

  it("getAllPools aggregates fulfilled results, ignoring failures", async () => {
    const reg = new PoolRegistry();
    reg.register(
      stubAdapter({
        type: "soroswap",
        listPools: vi.fn(async () => [
          {
            id: "soroswap:a",
            type: "soroswap",
            name: "a",
            tokens: [],
            tvl: 0n,
            apy: 1,
            state: "active",
            supportedActions: [],
            metadata: {},
          } as PoolInfo,
        ]),
      })
    );
    reg.register(
      stubAdapter({
        type: "aqua",
        listPools: vi.fn(async () => {
          throw new Error("boom");
        }),
      })
    );
    const out = await new Orchestrator(reg).getAllPools();
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("soroswap:a");
  });
});
