import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { backendClient } from "@/lib/services/backend-client";
import type { Locale } from "@/i18n/config";

export interface RatePoint {
  date: string;
  supply_apy: number;
  borrow_apy: number | null;
}

interface RateHistoryRow {
  supply_apy: number | null;
  borrow_apy: number | null;
  recorded_at: string;
}

async function fetchPoolRateHistory(
  poolId: string,
  locale: Locale
): Promise<RatePoint[]> {
  const rows = await backendClient.get<RateHistoryRow[]>(
    `/v1/pool-rates/${encodeURIComponent(poolId)}`
  );

  return (rows ?? []).map((row) => {
    const d = new Date(row.recorded_at);
    const label = `${d.getDate()} ${d.toLocaleString(locale, { month: "short" })}`;
    return {
      date: label,
      supply_apy: row.supply_apy ?? 0,
      borrow_apy: row.borrow_apy ?? null,
    };
  });
}

export function usePoolRateHistory(poolId: string) {
  const locale = useLocale() as Locale;
  return useQuery({
    queryKey: ["pool-rate-history", poolId, locale],
    queryFn: () => fetchPoolRateHistory(poolId, locale),
    staleTime: 60 * 60 * 1000, // 1 hour  matches cron frequency
    retry: false,
  });
}
