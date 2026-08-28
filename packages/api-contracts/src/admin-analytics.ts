import type { AuditActionType } from "./audit.js";

export interface OverviewStats {
  tvlUsd: number;
  volumeUsd: number;
  swapsCount: number;
  swapsVolumeUsd: number;
}

export interface UserStats {
  totalUsers: number;
  emailConfirmed: number;
  emailConfirmedPct: number;
  investedCount: number;
  investedPct: number;
  reinvestedCount: number;
  reinvestedPct: number;
}

export interface TransactionRow {
  id: number;
  createdAt: string;
  actionType: string;
  walletAddress: string | null;
  email: string | null;
  amountIn: number | null;
  amountOut: number | null;
  assetIn: string | null;
  assetOut: string | null;
  txHash: string | null;
}

export interface ListTransactionsFilters {
  actionType?: AuditActionType;
  wallet?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface ListTransactionsResult {
  rows: TransactionRow[];
  total: number;
}

export interface WalletVaultPosition {
  vaultId: string;
  symbol: string;
  name: string;
  amountTokens: number;
  balanceUsd: number;
}

export interface VaultDepositor {
  wallet: string;
  email: string | null;
  amountTokens: number;
  balanceUsd: number;
}

export interface VaultDepositorsGroup {
  vaultId: string;
  symbol: string;
  depositors: VaultDepositor[];
}
