import { useQuery } from "@tanstack/react-query";

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

async function fetchAssetPriceHistory(symbol: string): Promise<PricePoint[]> {
  const res = await fetch(`/api/asset-prices/${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error("Failed to fetch asset price history");
  const json = (await res.json()) as AssetPriceHistoryResponse;

  return (json.data ?? []).map((row) => {
    const d = new Date(row.recorded_at);
    const label = `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
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
  return useQuery({
    queryKey: ["asset-price-history", symbol],
    queryFn: () => fetchAssetPriceHistory(symbol!),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
    enabled: !!symbol,
  });
}
