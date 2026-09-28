"use client";

import { useQuery } from "@tanstack/react-query";
import { getQuote, getAvailableTokens } from "@/lib/helpers/stellar/swap-kit";
import type { Token } from "@/lib/types/swapTypes";
import { fromSmallestUnit } from "@neko-protocol/orchestrator";
import { safeParseFloat } from "@/lib/helpers/formatUtils";
import { DEFAULT_SLIPPAGE_BPS } from "@/features/shared/swap-engine/constants/swapConfig";

export function useSimulatorStablecoinBondQuote(opts: {
  stableCoinCode: string;
  bondSymbol: string;
  amountStableHuman: string;
  enabled: boolean;
}) {
  const { stableCoinCode, bondSymbol, amountStableHuman, enabled } = opts;

  const stableAmt = safeParseFloat(amountStableHuman);

  return useQuery({
    queryKey: [
      "simulator-stable-bond-quote",
      stableCoinCode,
      bondSymbol,
      amountStableHuman,
    ],
    queryFn: async () => {
      const tokens = getAvailableTokens();
      const sInfo = tokens[stableCoinCode.toUpperCase()];
      const bInfo = tokens[bondSymbol.toUpperCase()];
      if (!sInfo?.contract || !bInfo?.contract) {
        throw new Error(
          `No on-chain config for ${stableCoinCode}→${bondSymbol}. Check assets config.`
        );
      }
      const assetIn: Token = {
        type: "contract",
        contract: sInfo.contract,
        code: stableCoinCode,
      };
      const assetOut: Token = {
        type: "contract",
        contract: bInfo.contract,
        code: bondSymbol,
      };
      const quote = await getQuote({
        assetIn,
        assetOut,
        amount: amountStableHuman,
        tradeType: "EXACT_IN",
        slippageBps: DEFAULT_SLIPPAGE_BPS,
      });
      if (!quote) {
        throw new Error("No liquidity quote for this pair");
      }
      const bondDecimals = bInfo.decimals ?? 7;
      const bondOutHuman = parseFloat(
        fromSmallestUnit(quote.amountOut, bondDecimals)
      );
      if (!Number.isFinite(bondOutHuman) || bondOutHuman <= 0) {
        throw new Error("Swap quote returned no bond output");
      }
      return { quote, bondOutHuman };
    },
    enabled:
      enabled &&
      stableAmt > 0 &&
      Boolean(stableCoinCode) &&
      Boolean(bondSymbol),
    staleTime: 8_000,
  });
}
