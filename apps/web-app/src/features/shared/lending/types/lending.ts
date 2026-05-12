export interface PoolData {
  id: string;
  /** Source: native lending (`neko`) or orchestrator `PoolInfo.type` (e.g. aqua). */
  protocolId: string;
  name: string;
  token1: string;
  token2: string;
  fee: string;
  roi: string;
  feeApy: string;
  liquidity: string;
  isActive: boolean;
  assetCode: string;
  asset: string;
  bTokenRate?: string;
  /** Formatted total borrowed from this pool; undefined for non-lending pools */
  totalBorrowed?: string;
  /** Raw token amount for liquidity (human-readable, e.g. "3046.55")  used for USD conversion */
  liquidityTokenAmount?: string;
  /** Token code for price lookup (e.g. "USDC") */
  liquidityTokenCode?: string;
  /** Raw token amount for total borrowed (human-readable)  used for USD conversion */
  totalBorrowedTokenAmount?: string;
  /** Borrow APY for Blend pools (e.g. "3.89%"); undefined for non-lending pools */
  borrowApy?: string;
  contractId: string;
  isAggregated?: boolean;
  orchestratorId?: string;
  hideRowActions?: boolean;
  /** User's deposited amount (formatted, no symbol)  used in withdraw modal */
  depositedAmount?: string;
}
