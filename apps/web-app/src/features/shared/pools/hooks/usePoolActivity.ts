import { useQuery } from "@tanstack/react-query";

export interface PoolEvent {
  id: string;
  type: string;
  user: string | null;
  asset: string | null;
  amount: number | null;
  ts: number;
}

async function fetchPoolActivity(poolId: string): Promise<PoolEvent[]> {
  const res = await fetch(`/api/pool-activity/${encodeURIComponent(poolId)}`);
  if (!res.ok) throw new Error("Failed to fetch activity");
  return (await res.json()).events;
}

export function usePoolActivity(poolId: string) {
  return useQuery({
    queryKey: ["pool-activity", poolId],
    queryFn: () => fetchPoolActivity(poolId),
    staleTime: 60_000,
    retry: false,
  });
}
