import { useMemo } from "react";
import { STOCK_INFO } from "../utils/stockInfo";
import type { StockInfo } from "../types/discover";

export function useStockInfo(symbol: string): StockInfo | undefined {
  const symbolUpper = symbol?.toUpperCase() ?? "";
  return useMemo(
    () => STOCK_INFO[symbolUpper],
    [symbolUpper]
  );
}
