import {
  StellarPriceService,
  type StellarPriceServiceDeps,
} from "@neko/keeper";
import { getAvailableTokens, getQuote } from "@/lib/helpers/stellar/swap-kit";
import { getAssetsConfig } from "@/lib/constants/assets.config";
import { getReflectorClient } from "@/lib/helpers/stellar/reflector-client";

export type { PriceSource, PricedResult } from "@neko/keeper";
export { StellarPriceService };

const deps: StellarPriceServiceDeps = {
  getSwapKitUsdPrice: async (contractAddress, decimals) => {
    const usdc = getAvailableTokens().USDC;
    if (!usdc?.contract) return 0;
    const quote = await getQuote({
      assetIn: contractAddress,
      assetOut: usdc.contract,
      amount: "1",
      tradeType: "EXACT_IN",
      slippageBps: 0,
    });
    if (!quote) return 0;
    const inputScale = 10 ** decimals;
    const quotedInput = Number(quote.amountIn) / inputScale;
    if (quotedInput <= 0) return 0;
    return Number(quote.amountOut) / 10 ** usdc.decimals / quotedInput;
  },
  getReflectorClient: () => getReflectorClient(),
  getAssetConfig: (code) => getAssetsConfig()[code],
};

export const stellarPriceService = new StellarPriceService(deps);
