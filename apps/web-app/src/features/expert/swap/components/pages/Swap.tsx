"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { ChevronDown, ArrowLeftRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { getTokenAddress } from "@/lib/helpers/stellar/soroswap";
import {
  getTokens,
  getAvailableTokens,
  type Token,
} from "@/lib/helpers/stellar/soroswap";
import { extractContractErrorOrNull } from "@/lib/helpers/stellar/contractErrors";
import { formatAmount } from "@/lib/helpers/formatUtils";
import {
  sanitizeAmountInput,
  fromSmallestUnit,
  getTokenIconFitClass,
  getExplorerUrl,
} from "@/lib/helpers/tokenUtils";
import { DEFAULT_SLIPPAGE_BPS } from "@/features/expert/swap/constants/swapConfig";
import { useToast } from "@/hooks/useToast";
import { TOAST_CONFIG } from "@/lib/constants/toast.config";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import TokenSelectorModal from "../ui/TokenSelectorModal";

import { useSwapState } from "../../hooks/useSwapState";
import { useTokenSelection } from "../../hooks/useTokenSelection";
import { useSwapQuote } from "../../hooks/useSwapQuote";
import { useSwapExecution } from "../../hooks/useSwapExecution";
import { useSwapPrices } from "../../hooks/useSwapPrices";

import { SwapButton } from "../ui/SwapButton";
import { OrderTypeTabs } from "../ui/OrderTypeTabs";

interface TokenSelectorBtnProps {
  token: Token | string;
  getTokenId: (t: Token | string) => string;
  getTokenIconUrl: (t: Token | string) => string | null;
  onClick: () => void;
  disabled?: boolean;
}

const TokenSelectorBtn: React.FC<TokenSelectorBtnProps> = ({
  token,
  getTokenId,
  getTokenIconUrl,
  onClick,
  disabled,
}) => {
  const iconUrl = getTokenIconUrl(token);
  const tokenId = getTokenId(token);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2.5 bg-[#2A2A2A] hover:bg-[#333] rounded-xl px-3.5 py-2.5 w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="relative h-[28px] w-[28px] shrink-0 overflow-hidden rounded-full">
        {iconUrl ? (
          <Image
            src={iconUrl}
            alt={tokenId}
            width={28}
            height={28}
            unoptimized
            className={getTokenIconFitClass(tokenId)}
          />
        ) : (
          <div className="w-[28px] h-[28px] rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">
            {tokenId[0] || "?"}
          </div>
        )}
      </div>
      <span className="text-white font-medium text-sm truncate">
        {tokenId || "Select token"}
      </span>
      <ChevronDown className="ml-auto h-4 w-4 text-white/40 shrink-0" />
    </button>
  );
};

interface BalanceCardProps {
  balance?: string;
  /** For XLM: amount after reserve; Max fills this. Defaults to balance. */
  maxSpendable?: string;
  fiatValue?: string;
  isLoadingBalance?: boolean;
  isLoadingPrice?: boolean;
  onMaxClick?: () => void;
  isReadOnly?: boolean;
}

const BalanceCard: React.FC<BalanceCardProps> = ({
  balance,
  maxSpendable,
  fiatValue,
  isLoadingBalance,
  isLoadingPrice,
  onMaxClick,
  isReadOnly,
}) => {
  const maxAmt = maxSpendable ?? balance;

  return (
    <div className="bg-[#252525] rounded-xl p-3.5">
      <div className="text-white font-bold text-xl">
        {isLoadingPrice ? (
          <span className="text-white/40 text-sm">Loading…</span>
        ) : (
          <>{fiatValue || "0.00"}</>
        )}
      </div>
      <div className="flex items-center justify-between mt-1 gap-2">
        <span className="text-white/40 text-xs min-w-0 truncate">
          Your balance{" "}
          {isLoadingBalance ? "..." : formatAmount(maxAmt || "0", 2)}
        </span>
        <button
          onClick={isReadOnly ? undefined : onMaxClick}
          disabled={
            isReadOnly || !maxAmt || parseFloat(maxAmt) <= 0 || isLoadingBalance
          }
          className={`text-xs transition-colors shrink-0 ${
            isReadOnly
              ? "invisible"
              : "text-white/40 hover:text-white/70 disabled:cursor-not-allowed"
          }`}
        >
          Max
        </button>
      </div>
    </div>
  );
};

const Swap: React.FC = () => {
  const { address, network, networkPassphrase, refetchBalances } = useWallet();
  const { addNotification } = useToast();
  const queryClient = useQueryClient();

  const searchParams = useSearchParams();
  const availableTokens = getAvailableTokens();
  const tokenCodes = Object.keys(availableTokens);
  const tokens = getTokens();

  const defaultTokenIn = tokens.XLM || "";
  const toParam = searchParams.get("to")?.toUpperCase();
  const defaultTokenOut =
    (toParam && tokens[toParam]) ||
    availableTokens[tokenCodes[1]]?.contract ||
    tokens.USDC ||
    "";

  const swapState = useSwapState(defaultTokenIn, defaultTokenOut);
  const {
    orderType,
    amountIn,
    amountOut,
    tokenIn,
    tokenOut,
    txHash,
    isLoading,
    setOrderType,
    setAmountIn,
    setTxHash,
    setIsLoading,
    resetSwap,
    swapTokens,
  } = swapState;

  const tokenSelection = useTokenSelection(
    tokenIn,
    tokenOut,
    swapState.setTokenIn,
    swapState.setTokenOut,
    resetSwap,
    setTxHash
  );
  const {
    tokenSelectorOpen,
    tokenSelectorType,
    openTokenSelector,
    closeTokenSelector,
    selectToken,
    getTokenId,
    getTokenIconUrl,
  } = tokenSelection;

  const {
    balance: tokenInSpendable,
    totalBalance: tokenInTotal,
    isLoading: isLoadingBalance,
  } = useTokenBalance(tokenIn as Token | string | undefined);

  const {
    amountOut: quoteAmountOut,
    isLoadingQuote,
    quoteError,
    platformFee,
  } = useSwapQuote(address, amountIn, tokenIn, tokenOut);

  useEffect(() => {
    if (quoteAmountOut) {
      swapState.setAmountOut(quoteAmountOut);
    }
  }, [quoteAmountOut, swapState]);

  const { fiatValue, fiatValueOut, isLoadingPrice, isLoadingOutPrice } =
    useSwapPrices(amountIn, amountOut, tokenIn, tokenOut);

  const { executeSwap } = useSwapExecution();

  const handleSwap = async () => {
    if (!amountIn || parseFloat(amountIn) <= 0 || !address) {
      return;
    }

    if (isInsufficientBalance) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await executeSwap({
        amountIn,
        tokenIn,
        tokenOut,
        address,
        networkPassphrase,
      });

      if (result.orderId) {
        setTxHash(result.orderId);
        const explorerUrl = getExplorerUrl(result.orderId, network);
        addNotification("Transaction successful", "success", {
          ...TOAST_CONFIG.defaultOpts,
          description: "Swap completed successfully.",
          ...(explorerUrl
            ? {
                styles: {
                  button:
                    "!mx-auto !mt-3 !box-border !flex !h-9 !w-[220px] !max-w-full !items-center !justify-center !rounded-full !bg-[#229EDF] !px-4 !text-sm !font-semibold !leading-5 !text-white !no-underline hover:!bg-[#1a8bc7]",
                },
                button: {
                  title: "View on Stellar Expert",
                  onClick: () => {
                    window.open(explorerUrl, "_blank", "noopener,noreferrer");
                  },
                },
              }
            : {}),
        });

        const tokenOutAddress = getTokenAddress(
          tokenOut as Parameters<typeof getTokenAddress>[0]
        );
        const tokenInAddress = getTokenAddress(
          tokenIn as Parameters<typeof getTokenAddress>[0]
        );

        // Refresh Horizon balances (covers XLM + classic Stellar assets)
        void refetchBalances();

        // Force-refresh the Soroban contract balance for both tokens so
        // RWA balances update immediately instead of waiting for the poll.
        void queryClient.invalidateQueries({
          queryKey: ["tokenBalance", tokenOutAddress, address],
        });
        void queryClient.invalidateQueries({
          queryKey: ["tokenBalance", tokenInAddress, address],
        });
        // Also invalidate Horizon-sourced balances used by useWallet
        void queryClient.invalidateQueries({
          queryKey: ["stellar-balances", address],
        });

        resetSwap();
        setAmountIn("");
        swapState.setAmountOut("0.0");
      }
    } catch (err) {
      if (err instanceof Error && err.message === "USER_REJECTED") {
        setIsLoading(false);
        return;
      }

      const contractError = extractContractErrorOrNull(err);
      const errorMessage = contractError
        ? `Contract error: ${contractError}`
        : err instanceof Error
          ? err.message
          : "Failed to complete swap";
      addNotification("Swap failed", "error", {
        ...TOAST_CONFIG.defaultOpts,
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (value: string) => {
    setAmountIn(value);
    resetSwap();
    setTxHash(null);
  };

  const handleMaxClick = () => {
    if (tokenInSpendable && parseFloat(tokenInSpendable) > 0) {
      setAmountIn(tokenInSpendable);
    }
  };

  const canGetQuote = address && amountIn && parseFloat(amountIn) > 0;

  const isInsufficientBalance =
    !!amountIn &&
    !!tokenInSpendable &&
    parseFloat(amountIn) > parseFloat(tokenInSpendable);

  return (
    <PageContainer maxWidth="4xl">
      {}
      <BannerPage
        title="Swap Currency"
        subtitle="Select an option and swap your currencies"
        badge="Conversion"
        imageSrc="/banners/swap.svg"
        imageAlt="Swap illustration"
        imageLayoutClassName="-right-12 -top-[15px] h-[120%] w-[96%] opacity-60 sm:right-0 sm:top-0 sm:h-full sm:w-[55%] sm:opacity-100"
        className="mb-6"
      />

      {}
      <div className="flex flex-col gap-3 mb-5">
        <OrderTypeTabs orderType={orderType} onOrderTypeChange={setOrderType} />
      </div>

      {}
      {!address && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5 text-center text-white/60 text-sm">
          Connect your wallet to start swapping
        </div>
      )}

      {}
      <div className="relative">
        <div className="grid grid-cols-2 gap-4">
          {}
          <div className="bg-[#1C1C1C] rounded-[20px] p-5 flex flex-col gap-4">
            <span className="text-white/50 text-sm font-medium">From</span>

            <TokenSelectorBtn
              token={tokenIn}
              getTokenId={getTokenId}
              getTokenIconUrl={getTokenIconUrl}
              onClick={() => openTokenSelector("from")}
              disabled={!address || isLoading}
            />

            <div>
              <span className="text-white/50 text-sm font-semibold block mb-2">
                Amount
              </span>
              <div className="bg-[#2A2A2A] rounded-xl px-4 h-14 flex items-center">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountIn}
                  onChange={(e) =>
                    handleAmountChange(sanitizeAmountInput(e.target.value))
                  }
                  placeholder="0.00"
                  disabled={!address || isLoading}
                  className="bg-transparent text-white font-bold w-full outline-none placeholder:text-white/30 disabled:opacity-50 leading-none"
                  style={{ fontSize: "1.5rem" }}
                />
              </div>
            </div>

            <BalanceCard
              balance={tokenInTotal ?? tokenInSpendable}
              maxSpendable={tokenInSpendable}
              fiatValue={fiatValue}
              isLoadingBalance={isLoadingBalance}
              isLoadingPrice={isLoadingPrice}
              onMaxClick={handleMaxClick}
            />
          </div>

          {}
          <div className="bg-[#1C1C1C] rounded-[20px] p-5 flex flex-col gap-4">
            <span className="text-white/50 text-sm font-medium">To</span>

            <TokenSelectorBtn
              token={tokenOut}
              getTokenId={getTokenId}
              getTokenIconUrl={getTokenIconUrl}
              onClick={() => openTokenSelector("to")}
              disabled={!address || isLoading}
            />

            <div>
              <span className="text-white/50 text-sm font-semibold block mb-2">
                Amount
              </span>
              <div className="bg-[#2A2A2A] rounded-xl px-4 h-14 flex items-center gap-2">
                {isLoadingQuote ? (
                  <span className="text-white/40 text-sm">Loading…</span>
                ) : (
                  <span
                    className="text-white font-bold leading-none"
                    style={{ fontSize: "1.5rem" }}
                  >
                    {amountOut && amountOut !== "0.0"
                      ? formatAmount(amountOut)
                      : "0.00"}
                  </span>
                )}
              </div>
              {quoteError && !isLoadingQuote && (
                <p className="text-red-400 text-xs mt-1.5">{quoteError}</p>
              )}
            </div>

            <BalanceCard
              fiatValue={fiatValueOut}
              isLoadingPrice={isLoadingOutPrice}
              isReadOnly
            />
          </div>
        </div>

        {}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <button
            onClick={swapTokens}
            disabled={isLoading}
            aria-label="Swap tokens"
            className="bg-[#229EDF] hover:bg-[#1a8bc7] text-white p-3 rounded-full shadow-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeftRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {canGetQuote && !isLoadingQuote && platformFee && (
        <div className="mt-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between items-center text-white/60">
            <span>Platform fee</span>
            <span className="text-white/80 font-medium">
              {(platformFee.feeBps / 100).toFixed(4)}%{" · "}
              {formatAmount(fromSmallestUnit(platformFee.feeAmount, 7))}{" "}
              {getTokenId(tokenIn)}
            </span>
          </div>
          <div className="flex justify-between items-center text-white/60">
            <span>Slippage tolerance</span>
            <span className="text-white/80">
              {(DEFAULT_SLIPPAGE_BPS / 100).toFixed(4)}%
            </span>
          </div>
        </div>
      )}

      {}
      {}
      <div className="mt-5">
        <SwapButton
          address={address}
          canGetQuote={!!canGetQuote}
          isLoading={isLoading}
          txHash={txHash}
          isLoadingQuote={isLoadingQuote}
          orderType={orderType}
          isInsufficientBalance={isInsufficientBalance}
          onClick={handleSwap}
        />
      </div>

      <TokenSelectorModal
        isOpen={tokenSelectorOpen}
        onClose={closeTokenSelector}
        onSelectToken={selectToken}
        selectedToken={
          (tokenSelectorType === "from" ? tokenIn : tokenOut) as Token | string
        }
      />
    </PageContainer>
  );
};

export default Swap;
