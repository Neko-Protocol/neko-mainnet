export type PoolType = "blend" | "neko" | "soroswap" | "aqua" | "custom";

export type PoolState = "active" | "frozen" | "on_ice" | "unknown";

export type PoolAction =
  | "deposit"
  | "withdraw"
  | "claimRewards"
  | "borrow"
  | "borrowWithCollateral"
  | "repay"
  | "supplyCollateral"
  | "withdrawCollateral";

export interface TokenInfo {
  address: string;

  code: string;

  name: string;

  decimals: number;
}

export interface PoolInfo {
  id: string;
  type: PoolType;
  name: string;
  tokens: TokenInfo[];

  tvl: bigint;

  apy: number;
  state: PoolState;

  supportedActions: PoolAction[];

  metadata: Record<string, unknown>;
}

export interface PoolPosition {
  poolId: string;

  deposited: bigint;

  depositedFormatted: string;

  rewards: bigint;

  rewardsFormatted: string;

  metadata: Record<string, unknown>;
}

export interface TransactionResult {
  xdr: string;
  networkPassphrase: string;
}

export interface PoolActionOptions {
  withdrawAll?: boolean;
  withdrawUnit?: "underlying" | "lp_shares";
}

export interface PoolActionResult {
  tx: TransactionResult;

  preTx?: TransactionResult;
}

export interface PoolActionAuditContext {
  tokens: TokenInfo[];
  poolType: PoolType;
  metadata: Record<string, unknown>;
}

export interface PoolActionParams {
  poolId: string;
  action: PoolAction;
  amount: bigint;
  tokenIndex?: number;
  withdrawAll?: boolean;
  withdrawUnit?: "underlying" | "lp_shares";
  audit?: PoolActionAuditContext;
  collateralAssetAddress?: string;
  collateralAmount?: bigint;
}
