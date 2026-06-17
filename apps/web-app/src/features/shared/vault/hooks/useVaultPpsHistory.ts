import { useQuery } from "@tanstack/react-query";
import { backendClient } from "@/lib/services/backend-client";

export interface VaultPpsPoint {
  date: string;
  pps: string;
  recordedAt: string;
}

interface VaultPpsHistoryResponse {
  data: { pps: string; recorded_at: string }[];
  apy7d: number | null;
}

async function fetchVaultPpsHistory(
  vaultId: string
): Promise<{ points: VaultPpsPoint[]; apy7d: number | null }> {
  const json = await backendClient.get<VaultPpsHistoryResponse>(
    `/v1/vault-pps/${encodeURIComponent(vaultId)}`
  );

  const points: VaultPpsPoint[] = (json.data ?? []).map((row) => {
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
