import { useQuery } from "@tanstack/react-query";

export interface RatePoint {
  date: string;
  supply_apy: number;
  borrow_apy: number | null;
}

async function fetchPoolRateHistory(poolId: string): Promise<RatePoint[]> {
  const res = await fetch(`/api/pool-rates/${encodeURIComponent(poolId)}`);
  if (!res.ok) throw new Error("Failed to fetch pool rate history");
  const json = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.data ?? []).map((row: any) => {
    const d = new Date(row.recorded_at);
    const label = `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
    return {
      date: label,
      supply_apy: row.supply_apy ?? 0,
      borrow_apy: row.borrow_apy ?? null,
    };
  });
}

export function usePoolRateHistory(poolId: string) {
  return useQuery({
    queryKey: ["pool-rate-history", poolId],
    queryFn: () => fetchPoolRateHistory(poolId),
    staleTime: 60 * 60 * 1000, // 1 hour  matches cron frequency
    retry: false,
  });
}
