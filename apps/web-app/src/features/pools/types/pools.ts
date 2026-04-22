export interface PoolCardData {
  id: string;
  token1: string;
  token2: string;
  fee: string;
  roi: string;
  feeApy: string;
  liquidity: string;
  /** Raw token amount string for pools where liquidity is not yet USD (Blend, Soroswap) */
  liquidityTokenAmount?: string;
  /** Token code used to fetch USD price for liquidity (undefined = already USD) */
  liquidityTokenCode?: string;
  /** Formatted total borrowed amount, or "-" for non-lending pools */
  totalBorrowed: string;
  /** Raw token amount for borrowed (Blend only), used to compute USD in table */
  totalBorrowedTokenAmount?: string;
  isActive: boolean;
  type: string;
}

export interface PoolDetailView {
  token1: string;
  token2: string;
  tvlFormatted: string;
  apyFormatted: string;
  typeLabel: string;
}
