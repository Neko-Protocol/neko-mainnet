import { Networks } from "@stellar/stellar-sdk";
import { SwapKit } from "@xbullcorp/swap-kit";
import { networkPassphrase, rpcUrl } from "@/lib/constants/network";
import { stellarNetwork } from "@/lib/config/stellar.config";
import { resolveDecimalsForSwapToken } from "@/lib/helpers/auditAssetAmounts";
import type {
  BuildRequest,
  BuildResponse,
  QuoteRequest,
  QuoteResponse,
} from "../../../types/swapTypes";
import { getTokenAddress } from "./tokens";

const swapKit = new SwapKit({
  rpcUrl,
  allowHttp: stellarNetwork === "LOCAL",
  passphrase: networkPassphrase as Networks,
});

function toAtomicUnits(amount: string, decimals: number): bigint {
  const value = amount.trim();
  if (!/^\d+(\.\d*)?$/.test(value)) {
    throw new Error("Swap amount must be a positive number");
  }

  const [whole, fraction = ""] = value.split(".");
  const atomic = `${whole}${fraction.padEnd(decimals, "0").slice(0, decimals)}`;
  return BigInt(atomic || "0");
}

export async function getQuoteServer(
  request: QuoteRequest
): Promise<QuoteResponse> {
  if (request.tradeType !== "EXACT_IN") {
    throw new Error("xBull Swap currently supports exact-input swaps only");
  }

  const decimals = resolveDecimalsForSwapToken(request.assetIn) ?? 7;
  const amount = toAtomicUnits(request.amount, decimals);
  if (amount <= 0n) throw new Error("Swap amount must be greater than zero");

  const slippageBps = BigInt(request.slippageBps ?? 500);
  if (slippageBps < 0n || slippageBps >= 10_000n) {
    throw new Error("Slippage must be between 0 and 9999 basis points");
  }

  const quote = await swapKit.quote({
    fromAsset: getTokenAddress(request.assetIn),
    toAsset: getTokenAddress(request.assetOut),
    amount,
    // Referral fees are intentionally omitted.
  });
  const minToReceive = (quote.toAmount * (10_000n - slippageBps)) / 10_000n;

  return {
    amountIn: quote.fromAmount.toString(),
    amountOut: quote.toAmount.toString(),
    route: quote.route,
    minToReceive: minToReceive.toString(),
    platformFee: quote.fee.platformFee.toString(),
  };
}

export async function buildTransactionServer(
  request: BuildRequest
): Promise<BuildResponse> {
  const result = await swapKit.strictSend({
    source: request.from,
    from: request.from,
    to: request.to ?? request.from,
    route: request.quote.route,
    amount: request.quote.amountIn,
    minToReceive: request.quote.minToReceive,
    // Referral fees are intentionally omitted.
  });
  return { xdr: result.transactionXDR };
}
