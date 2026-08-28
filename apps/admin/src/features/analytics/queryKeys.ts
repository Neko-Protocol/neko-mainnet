import type { ListTransactionsFilters } from "@neko/api-contracts";

export const analyticsKeys = {
  overview: ["analytics", "overview"] as const,
  users: ["analytics", "users"] as const,
  vaults: ["analytics", "vaults"] as const,
  walletPositions: (wallet: string) =>
    ["analytics", "wallet-positions", wallet] as const,
  transactions: (filters: ListTransactionsFilters) =>
    ["analytics", "transactions", filters] as const,
};
