import type {
  PoolAction,
  PoolActionOptions,
  PoolInfo,
  PoolPosition,
  PoolType,
  TransactionResult,
} from "./pool.types.js";

export interface BasePoolAdapter {
  readonly type: PoolType;

  getPoolInfo(poolId: string): Promise<PoolInfo>;

  listPools(limit?: number): Promise<PoolInfo[]>;

  getUserPosition(poolId: string, userAddress: string): Promise<PoolPosition>;

  deposit(
    poolId: string,
    userAddress: string,
    amount: bigint,
    tokenIndex?: number
  ): Promise<TransactionResult>;

  withdraw(
    poolId: string,
    userAddress: string,
    amount: bigint,
    tokenIndex?: number,
    options?: PoolActionOptions
  ): Promise<TransactionResult>;

  claimRewards(poolId: string, userAddress: string): Promise<TransactionResult>;

  borrow?(
    poolId: string,
    userAddress: string,
    amount: bigint
  ): Promise<TransactionResult>;

  repay?(
    poolId: string,
    userAddress: string,
    amount: bigint
  ): Promise<TransactionResult>;

  supplyCollateral?(
    poolId: string,
    userAddress: string,
    amount: bigint
  ): Promise<TransactionResult>;

  withdrawCollateral?(
    poolId: string,
    userAddress: string,
    amount: bigint,
    options?: PoolActionOptions
  ): Promise<TransactionResult>;

  supportsAction(action: PoolAction): boolean;
}
