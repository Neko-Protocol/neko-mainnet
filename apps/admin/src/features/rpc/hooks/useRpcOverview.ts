import { useQuery } from "@tanstack/react-query";
import { fetchRpcOverview } from "../actions";
import { rpcOverviewKeys } from "../queryKeys";

/**
 * Pool health moves on a 20s probe, so the page refetches on that cadence.
 * Anything slower and an endpoint could drop and recover unseen.
 */
const REFETCH_MS = 20_000;

export function useRpcOverview() {
  return useQuery({
    queryKey: rpcOverviewKeys.snapshot,
    queryFn: fetchRpcOverview,
    refetchInterval: REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}
