import { useCallback } from "react";
import { rpc } from "@stellar/stellar-sdk";
import { rpcUrl, stellarNetwork } from "@/lib/config/stellar.config";
import type { Token } from "@/lib/helpers/stellar/soroswap";
import {
  getQuote,
  buildTransaction,
  sendTransaction,
  submitClassicTrustlineToHorizon,
  TrustlineRequiredError,
  type QuoteRequest,
} from "@/lib/helpers/stellar/soroswap";
import {
  resolveDecimalsForSwapToken,
  smallestUnitsStringToHuman,
} from "@/lib/helpers/auditAssetAmounts";
import {
  DEFAULT_SLIPPAGE_BPS,
  MAX_HOPS,
  PLATFORM_FEE_BPS,
  NEKO_TREASURY_ADDRESS,
} from "@/features/expert/swap/constants/swapConfig";
import { useWallet } from "@/hooks/useWallet";
import { auditService } from "@/lib/services/audit.service";
import { extractSignedTxXdr } from "@/lib/helpers/stellar/transaction";

export interface SwapExecutionParams {
  amountIn: string;
  tokenIn: Token | string;
  tokenOut: Token | string;
  address: string | undefined;
  networkPassphrase: string | undefined;
}

export interface SwapExecutionResult {
  orderId: string;
  txHash?: string;
}

export function useSwapExecution() {
  const { signTransaction, networkPassphrase } = useWallet();

  const executeSwap = useCallback(
    async (params: SwapExecutionParams): Promise<SwapExecutionResult> => {
      const { amountIn, tokenIn, tokenOut, address } = params;

      if (!amountIn || parseFloat(amountIn) <= 0 || !address) {
        throw new Error("Invalid amount or address");
      }

      if (!networkPassphrase) {
        throw new Error("Wallet not connected");
      }

      const quoteRequest: QuoteRequest = {
        assetIn: tokenIn as Token | string,
        assetOut: tokenOut as Token | string,
        amount: amountIn,
        tradeType: "EXACT_IN",
        protocols: NEKO_TREASURY_ADDRESS
          ? ["sdex"]
          : ["soroswap", "phoenix", "aqua"],
        slippageBps: DEFAULT_SLIPPAGE_BPS,
        maxHops: MAX_HOPS,
        ...(NEKO_TREASURY_ADDRESS
          ? { feeBps: PLATFORM_FEE_BPS, referralId: NEKO_TREASURY_ADDRESS }
          : {}),
      };

      const newQuote = await getQuote(quoteRequest);

      if (!newQuote) {
        throw new Error(
          "No liquidity found for this pair — try a different token combination"
        );
      }

      const outDecimals = resolveDecimalsForSwapToken(tokenOut);
      const amountOutHuman =
        outDecimals != null
          ? smallestUnitsStringToHuman(newQuote.amountOut, outDecimals)
          : undefined;

      const maxTrustlineRounds = 3;
      let buildResult: Awaited<ReturnType<typeof buildTransaction>> | undefined;
      for (let round = 0; round < maxTrustlineRounds; round++) {
        try {
          buildResult = await buildTransaction({
            quote: newQuote,
            from: address,
            to: address,
            ...(NEKO_TREASURY_ADDRESS
              ? { referralId: NEKO_TREASURY_ADDRESS }
              : {}),
          });
          break;
        } catch (err) {
          if (!(err instanceof TrustlineRequiredError)) {
            throw err;
          }

          let signedTrustline;
          try {
            signedTrustline = await signTransaction(err.trustlineXdr, {
              networkPassphrase: networkPassphrase,
              address: address,
            });
          } catch (signErr) {
            if (
              signErr instanceof Error &&
              (signErr.message?.includes("rejected") ||
                signErr.message?.includes("denied") ||
                signErr.message?.includes("User rejected"))
            ) {
              throw new Error("USER_REJECTED");
            }
            throw signErr;
          }

          const trustlineSignedXdr = extractSignedTxXdr(signedTrustline);

          await submitClassicTrustlineToHorizon(trustlineSignedXdr);
        }
      }

      if (!buildResult) {
        throw new Error(
          "Could not build the swap after adding the required trustline(s)."
        );
      }

      let signedResult;
      try {
        signedResult = await signTransaction(buildResult.xdr, {
          networkPassphrase: networkPassphrase,
          address: address,
        });
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message?.includes("rejected") ||
            error.message?.includes("denied") ||
            error.message?.includes("User rejected"))
        ) {
          throw new Error("USER_REJECTED");
        }
        throw error;
      }

      const signedXdrString = extractSignedTxXdr(signedResult);

      const sendResult = await sendTransaction({
        xdr: signedXdrString,
        launchtube: false,
      });

      if (sendResult.txHash) {
        const server = new rpc.Server(rpcUrl, {
          allowHttp: stellarNetwork === "LOCAL",
        });
        const confirmed = await server.pollTransaction(sendResult.txHash, {
          attempts: 30,
        });
        if (confirmed.status !== "SUCCESS") {
          throw new Error(`Swap failed on-chain (status: ${confirmed.status})`);
        }

        auditService.log({
          wallet_address: address,
          action_type: "swap",
          asset_in:
            typeof tokenIn === "string"
              ? tokenIn
              : (tokenIn.code ??
                (tokenIn.type === "native" ? "XLM" : tokenIn.contract)),
          asset_out:
            typeof tokenOut === "string"
              ? tokenOut
              : (tokenOut.code ??
                (tokenOut.type === "native" ? "XLM" : tokenOut.contract)),
          amount_in: parseFloat(amountIn),
          ...(amountOutHuman != null && Number.isFinite(amountOutHuman)
            ? { amount_out: amountOutHuman }
            : {}),
          tx_hash: sendResult.txHash,
          ...(newQuote.platformFee
            ? {
                platform_fee_bps: newQuote.platformFee.feeBps,
                platform_fee_amount: newQuote.platformFee.feeAmount,
              }
            : {}),
        });
        return { orderId: sendResult.txHash, txHash: sendResult.txHash };
      }

      throw new Error("Transaction failed");
    },
    [signTransaction, networkPassphrase]
  );

  return { executeSwap };
}
