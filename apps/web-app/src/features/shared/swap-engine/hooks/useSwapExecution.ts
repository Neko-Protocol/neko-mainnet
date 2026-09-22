import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { rpc } from "@stellar/stellar-sdk";
import { allowHttpForSoroban, rpcUrl } from "@/lib/constants/network";
import type { Token } from "@/lib/helpers/stellar/swap-kit";
import {
  getQuote,
  buildTransaction,
  sendTransaction,
  type QuoteRequest,
} from "@/lib/helpers/stellar/swap-kit";
import {
  resolveDecimalsForSwapToken,
  smallestUnitsStringToHuman,
} from "@/lib/helpers/auditAssetAmounts";
import { DEFAULT_SLIPPAGE_BPS } from "@/features/shared/swap-engine/constants/swapConfig";
import { useWallet } from "@/hooks/useWallet";
import { auditService } from "@/lib/services/audit.service";
import { ensureTrustlineForSwapToken } from "@/lib/helpers/stellar/trustline";
import { extractSignedTxXdr } from "@neko-protocol/orchestrator";

export interface SwapExecutionParams {
  amountIn: string;
  tokenIn: Token | string;
  tokenOut: Token | string;
  address: string | undefined;
  networkPassphrase: string | undefined;
  onStage?: (stage: "trustline" | "swap") => void;
}

export interface SwapExecutionResult {
  orderId: string;
  txHash?: string;
}

export function useSwapExecution() {
  const t = useTranslations("sharedSwapEngine.execution");
  const { signTransaction, networkPassphrase } = useWallet();

  const executeSwap = useCallback(
    async (params: SwapExecutionParams): Promise<SwapExecutionResult> => {
      const { amountIn, tokenIn, tokenOut, address, onStage } = params;

      if (!amountIn || parseFloat(amountIn) <= 0 || !address) {
        throw new Error(t("invalidAmountOrAddress"));
      }

      if (!networkPassphrase) {
        throw new Error(t("walletNotConnected"));
      }

      /**
       * An account can only receive a classic asset it trusts, and the router
       * refuses to build a swap into an untrusted one. Settle the trustline
       * first, then quote: doing it the other way round burns the quote, since
       * a quote expires in well under the time two wallet approvals take.
       */
      await ensureTrustlineForSwapToken({
        token: tokenOut,
        walletAddress: address,
        signTransaction,
        onTrustlineNeeded: () => onStage?.("trustline"),
        insufficientReserveMessage: (code) =>
          t("trustlineReserveRequired", { code }),
      });

      onStage?.("swap");

      const quoteRequest: QuoteRequest = {
        assetIn: tokenIn as Token | string,
        assetOut: tokenOut as Token | string,
        amount: amountIn,
        tradeType: "EXACT_IN",
        slippageBps: DEFAULT_SLIPPAGE_BPS,
        // Oppia binds an executable quote to its source account at quote time,
        // rather than accepting one at build time.
        sourceAddress: address,
      };

      const newQuote = await getQuote(quoteRequest);

      if (!newQuote?.sourceAddress) {
        throw new Error(t("noLiquidityRetry"));
      }

      const outDecimals = resolveDecimalsForSwapToken(tokenOut);
      const amountOutHuman =
        outDecimals != null
          ? smallestUnitsStringToHuman(newQuote.amountOut, outDecimals)
          : undefined;

      const buildResult = await buildTransaction({
        quote: newQuote,
        from: address,
        to: address,
      });

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
          allowHttp: allowHttpForSoroban,
        });
        const confirmed = await server.pollTransaction(sendResult.txHash, {
          attempts: 30,
        });
        if (confirmed.status !== "SUCCESS") {
          throw new Error(t("swapFailedOnChain", { status: confirmed.status }));
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
          token_amount_in: parseFloat(amountIn),
          ...(amountOutHuman != null && Number.isFinite(amountOutHuman)
            ? { amount_out: amountOutHuman }
            : {}),
          tx_hash: sendResult.txHash,
        });
        return { orderId: sendResult.txHash, txHash: sendResult.txHash };
      }

      throw new Error(t("transactionFailed"));
    },
    [signTransaction, networkPassphrase, t]
  );

  return { executeSwap };
}
