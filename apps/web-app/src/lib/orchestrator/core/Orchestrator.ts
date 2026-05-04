import { PoolRegistry, poolRegistry } from "./PoolRegistry";
import { BlendPoolAdapter } from "../adapters/BlendPoolAdapter";
import { SoroswapPoolAdapter } from "../adapters/SoroswapPoolAdapter";
import { AquaPoolAdapter } from "../adapters/AquaPoolAdapter";
import { getBlendPoolIds } from "../adapters/blend-config";
import { UnsupportedActionError } from "../types/errors";

import type {
  PoolInfo,
  PoolPosition,
  TransactionResult,
} from "../types/pool.types";

export class Orchestrator {
  constructor(private registry: PoolRegistry) {}

  async getPoolInfo(poolId: string): Promise<PoolInfo> {
    const adapter = this.registry.resolve(poolId);
    const rawId = PoolRegistry.stripPrefix(poolId);
    return adapter.getPoolInfo(rawId);
  }

  async getUserPosition(
    poolId: string,
    userAddress: string
  ): Promise<PoolPosition> {
    const adapter = this.registry.resolve(poolId);
    const rawId = PoolRegistry.stripPrefix(poolId);
    return adapter.getUserPosition(rawId, userAddress);
  }

  async deposit(
    poolId: string,
    userAddress: string,
    amount: bigint,
    tokenIndex?: number
  ): Promise<TransactionResult> {
    const adapter = this.registry.resolve(poolId);
    const rawId = PoolRegistry.stripPrefix(poolId);
    return adapter.deposit(rawId, userAddress, amount, tokenIndex);
  }

  async withdraw(
    poolId: string,
    userAddress: string,
    amount: bigint,
    tokenIndex?: number
  ): Promise<TransactionResult> {
    const adapter = this.registry.resolve(poolId);
    const rawId = PoolRegistry.stripPrefix(poolId);
    return adapter.withdraw(rawId, userAddress, amount, tokenIndex);
  }

  async borrow(
    poolId: string,
    userAddress: string,
    amount: bigint
  ): Promise<TransactionResult> {
    const adapter = this.registry.resolve(poolId);
    if (!adapter.borrow) {
      throw new UnsupportedActionError(adapter.type, "borrow");
    }
    const rawId = PoolRegistry.stripPrefix(poolId);
    return adapter.borrow(rawId, userAddress, amount);
  }

  async borrowWithCollateral(
    poolId: string,
    userAddress: string,
    borrowAmount: bigint,
    collateralAssetAddress: string,
    collateralAmount: bigint
  ): Promise<TransactionResult> {
    const adapter = this.registry.resolve(poolId);
    if (!(adapter instanceof BlendPoolAdapter)) {
      throw new UnsupportedActionError(adapter.type, "borrowWithCollateral");
    }
    const rawId = PoolRegistry.stripPrefix(poolId);
    return adapter.borrowWithCollateral(
      rawId,
      userAddress,
      borrowAmount,
      collateralAssetAddress,
      collateralAmount
    );
  }

  async repay(
    poolId: string,
    userAddress: string,
    amount: bigint
  ): Promise<TransactionResult> {
    const adapter = this.registry.resolve(poolId);
    if (!adapter.repay) {
      throw new UnsupportedActionError(adapter.type, "repay");
    }
    const rawId = PoolRegistry.stripPrefix(poolId);
    return adapter.repay(rawId, userAddress, amount);
  }

  async supplyCollateral(
    poolId: string,
    userAddress: string,
    amount: bigint
  ): Promise<TransactionResult> {
    const adapter = this.registry.resolve(poolId);
    if (!adapter.supplyCollateral) {
      throw new UnsupportedActionError(adapter.type, "supplyCollateral");
    }
    const rawId = PoolRegistry.stripPrefix(poolId);
    return adapter.supplyCollateral(rawId, userAddress, amount);
  }

  async withdrawCollateral(
    poolId: string,
    userAddress: string,
    amount: bigint
  ): Promise<TransactionResult> {
    const adapter = this.registry.resolve(poolId);
    if (!adapter.withdrawCollateral) {
      throw new UnsupportedActionError(adapter.type, "withdrawCollateral");
    }
    const rawId = PoolRegistry.stripPrefix(poolId);
    return adapter.withdrawCollateral(rawId, userAddress, amount);
  }

  async claimRewards(
    poolId: string,
    userAddress: string
  ): Promise<TransactionResult> {
    const adapter = this.registry.resolve(poolId);
    const rawId = PoolRegistry.stripPrefix(poolId);
    return adapter.claimRewards(rawId, userAddress);
  }

  async getAllPools(): Promise<PoolInfo[]> {
    const adapters = this.registry.getAdapters();

    const settled = await Promise.allSettled(
      adapters.map((a) => a.listPools())
    );

    const pools: PoolInfo[] = [];
    for (const result of settled) {
      if (result.status === "fulfilled") {
        pools.push(...result.value);
      } else {
        console.error(
          "[Orchestrator] adapter.listPools failed:",
          result.reason
        );
      }
    }

    return pools;
  }

  async getPoolsByType(type: PoolInfo["type"]): Promise<PoolInfo[]> {
    const adapter = this.registry.getAdapters().find((a) => a.type === type);
    if (!adapter) {
      return [];
    }

    try {
      return await adapter.listPools();
    } catch (error) {
      console.error(`[Orchestrator] ${type}.listPools failed:`, error);
      return [];
    }
  }

  supportsAction(poolId: string, action: string): boolean {
    try {
      const adapter = this.registry.resolve(poolId);
      return adapter.supportsAction(
        action as import("../types/pool.types").PoolAction
      );
    } catch {
      return false;
    }
  }
}

for (const blendPoolId of getBlendPoolIds()) {
  poolRegistry.register(new BlendPoolAdapter(blendPoolId));
}

poolRegistry.register(new SoroswapPoolAdapter());
poolRegistry.register(new AquaPoolAdapter());

export const orchestrator = new Orchestrator(poolRegistry);
