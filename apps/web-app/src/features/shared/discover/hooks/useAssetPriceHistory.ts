import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { backendClient } from "@/lib/services/backend-client";
import type { Locale } from "@/i18n/config";

export interface PricePoint {
  /** Display label (date) — kept for backwards compatibility. */
  date: string;
  /** Epoch milliseconds of when the price was recorded. */
  timestamp: number;
  price: number;
  source: string | null;
}

interface AssetPriceHistoryRow {
  recorded_at: string;
  price: number | string | null;
  source: string | null;
}

interface AssetPriceHistoryResponse {
  data?: AssetPriceHistoryRow[];
}

async function fetchAssetPriceHistory(
  symbol: string,
  locale: Locale
): Promise<PricePoint[]> {
  const json = await backendClient.get<AssetPriceHistoryResponse>(
    `/v1/asset-prices/${encodeURIComponent(symbol)}`
  );

  return (json.data ?? []).map((row) => {
    const d = new Date(row.recorded_at);
    const label = `${d.getDate()} ${d.toLocaleString(locale, { month: "short" })}`;
    const parsedPrice =
      typeof row.price === "number" ? row.price : Number(row.price ?? 0);
    return {
      date: label,
      timestamp: d.getTime(),
      price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
      source: row.source ?? null,
    };
  });
}

export function useAssetPriceHistory(symbol?: string) {
  const locale = useLocale() as Locale;
  return useQuery({
    queryKey: ["asset-price-history", symbol, locale],
    queryFn: () => fetchAssetPriceHistory(symbol!, locale),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
    enabled: !!symbol,
  });
}
