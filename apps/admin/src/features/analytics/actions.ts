"use server";

import type {
  ListTransactionsFilters,
  ListTransactionsResult,
  OverviewStats,
  UserStats,
} from "@neko/api-contracts";
import { fetchFromBackend } from "@/lib/services/backend-client";

export async function fetchOverview(): Promise<OverviewStats> {
  return fetchFromBackend<OverviewStats>("admin-analytics/overview");
}

export async function fetchUserStats(): Promise<UserStats> {
  return fetchFromBackend<UserStats>("admin-analytics/users");
}

export async function fetchTransactions(
  filters: ListTransactionsFilters
): Promise<ListTransactionsResult> {
  return fetchFromBackend<ListTransactionsResult>(
    "admin-analytics/transactions",
    { ...filters }
  );
}
