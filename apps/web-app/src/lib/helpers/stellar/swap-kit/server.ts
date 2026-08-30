import { Networks } from "@stellar/stellar-sdk";
import { SwapKit } from "@xbullcorp/swap-kit";
import {
  allowHttpForSoroban,
  networkPassphrase,
  rpcUrl,
} from "@/lib/constants/network";
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
  allowHttp: allowHttpForSoroban,
  passphrase: networkPassphrase as Networks,
});

const REFERRAL_FEE_PERCENTAGE = 20_000n;

function getReferralFees() {
  const referral = process.env.SWAP_REFERRAL_ADDRESS?.trim();
  if (!referral) {
    throw new Error("Missing SWAP_REFERRAL_ADDRESS for xBull referral fees");
  }

  return [{ referral, feePercentage: REFERRAL_FEE_PERCENTAGE }];
}

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
    referralFees: getReferralFees(),
  });
  const amountOut =
    quote.toAmount - quote.fee.platformFee - quote.fee.referralsFee;
  if (amountOut <= 0n) {
    throw new Error("Swap output is insufficient after fees");
  }
  const minToReceive = (amountOut * (10_000n - slippageBps)) / 10_000n;

  return {
    amountIn: quote.fromAmount.toString(),
    amountOut: amountOut.toString(),
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
    referralFees: getReferralFees(),
  });
  return { xdr: result.transactionXDR };
}
