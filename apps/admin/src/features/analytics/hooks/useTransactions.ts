import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ListTransactionsFilters } from "@neko/api-contracts";
import { fetchTransactions } from "../actions";
import { analyticsKeys } from "../queryKeys";

export function useTransactions(filters: ListTransactionsFilters) {
  return useQuery({
    queryKey: analyticsKeys.transactions(filters),
    queryFn: () => fetchTransactions(filters),
    placeholderData: keepPreviousData,
  });
}
