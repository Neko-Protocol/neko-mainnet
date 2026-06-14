import { useQuery } from "@tanstack/react-query";
import { backendClient } from "@/lib/services/backend-client";

export interface PoolEvent {
  id: string;
  type: string;
  user: string | null;
  asset: string | null;
  amount: number | null;
  ts: number;
}

async function fetchPoolActivity(poolId: string): Promise<PoolEvent[]> {
  const data = await backendClient.get<{ events: PoolEvent[] }>(
    `/v1/pool-activity/${encodeURIComponent(poolId)}`
  );
  return data.events;
}

export function usePoolActivity(poolId: string) {
  return useQuery({
    queryKey: ["pool-activity", poolId],
    queryFn: () => fetchPoolActivity(poolId),
    staleTime: 60_000,
    retry: false,
  });
}
