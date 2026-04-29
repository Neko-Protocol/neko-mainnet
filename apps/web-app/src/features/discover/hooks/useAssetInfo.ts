import { useMemo } from "react";
import { ASSET_INFO } from "../utils/stockInfo";
import type { AssetInfo } from "../types/discover";

export function useAssetInfo(symbol: string): AssetInfo | undefined {
  const symbolUpper = symbol?.toUpperCase() ?? "";
  return useMemo(() => ASSET_INFO[symbolUpper], [symbolUpper]);
}
