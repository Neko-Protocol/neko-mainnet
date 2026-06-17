import { useQuery } from "@tanstack/react-query";

export interface VaultPpsPoint {
  date: string;
  pps: string;
  recordedAt: string;
}

async function fetchVaultPpsHistory(
  vaultId: string
): Promise<{ points: VaultPpsPoint[]; apy7d: number | null }> {
  const res = await fetch(`/api/vault-pps/${encodeURIComponent(vaultId)}`);
  if (!res.ok) throw new Error("Failed to fetch vault PPS history");
  const json = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const points: VaultPpsPoint[] = (json.data ?? []).map((row: any) => {
    const d = new Date(row.recorded_at);
    const label = `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
    return {
      date: label,
      pps: row.pps,
      recordedAt: row.recorded_at,
    };
  });

  return { points, apy7d: json.apy7d ?? null };
}

export function useVaultPpsHistory(vaultId: string | null | undefined) {
  return useQuery({
    queryKey: ["vault-pps-history", vaultId],
    queryFn: () => fetchVaultPpsHistory(vaultId!),
    enabled: !!vaultId,
    staleTime: 60 * 60 * 1000, // 1 hour — matches cron frequency
    retry: false,
  });
}
