import { useQuery } from "@tanstack/react-query";
import { fetchInfrastructure } from "../actions";
import { infrastructureKeys } from "../queryKeys";

/**
 * Pool health moves on a 20s probe, so the page refetches on that cadence.
 * Anything slower and an endpoint could drop and recover unseen.
 */
const REFETCH_MS = 20_000;

export function useInfrastructure() {
  return useQuery({
    queryKey: infrastructureKeys.snapshot,
    queryFn: fetchInfrastructure,
    refetchInterval: REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}
