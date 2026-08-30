import { useQuery } from "@tanstack/react-query";
import { fetchMetricsHistory, type RangeKey } from "../history-actions";
import type { Environment } from "../grafana";

export function useMetricsHistory(environment: Environment, range: RangeKey) {
  return useQuery({
    queryKey: ["rpc-overview", "history", environment, range] as const,
    queryFn: () => fetchMetricsHistory(environment, range),
    // Grafana scrapes every 60s, so anything faster just re-reads the same
    // window.
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
