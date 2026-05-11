"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useHaptics } from "@/hooks/useHaptics";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useVaultApy } from "@/features/shared/vault/hooks/useVaultApy";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";
import { formatAmount, safeParseFloat } from "@/lib/helpers/formatUtils";
import type { MappedBalances } from "@/lib/helpers/stellar/wallet";
import { useEtherfuseYields } from "../hooks/useEtherfuseYields";
import {
  isEtherfuseBondToken,
  resolveEtherfuseBondApy,
} from "../hooks/useFilteredDestinations";
import { useProjectedReturns } from "../hooks/useProjectedReturns";
import { useSimulatorStablecoinBondQuote } from "../hooks/useSimulatorStablecoinBondQuote";
import { ProjectionTable } from "./ui/ProjectionTable";
import { StrategySummaryCard } from "./ui/StrategySummaryCard";
import type {
  SimulatorDestination,
  SimulatorToken,
} from "../types/simulator.types";
import {
  isStablecoinBondExplorer,
  type SimulationResolved,
} from "../utils/wizardPhases";
import type { VaultView } from "@/features/shared/vault/types/vault";

/** Stable bond deposit amount string after swap (vault / pool hooks expect human). */
function bondOutToDepositString(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  const s = n.toFixed(10).replace(/\.?0+$/, "");
  return s || "";
}

function parseBalanceString(raw: string | undefined): number {
  if (!raw) return 0;
  const parsed = parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getHoldingsAmount(balances: MappedBalances, code: string): number {
  if (code === "XLM" && balances.xlm) {
    return parseBalanceString(balances.xlm.balance);
  }
  const soroban = balances[`soroban:${code}`];
  if (soroban?.balance) {
    return parseBalanceString(String(soroban.balance));
  }
  for (const [key, entry] of Object.entries(balances)) {
    if (key.startsWith(`${code}:`) && entry.balance) {
      return parseBalanceString(String(entry.balance));
    }
  }
  return 0;
}

interface ReturnSimulatorStepProps {
  token: SimulatorToken;
  simulation: SimulationResolved;
  amount: string;
  onAmountChange: (next: string) => void;
  /** Vault modal opener - wizard resolves VaultView from raw */
  onStartDepositVault?: (vault: VaultView) => void;
  /** Lending supply deposit - wizard builds tx */
  onStartDepositLending?: () => void;
  /** Orchestrator pool deposit - wizard builds tx */
  onStartDepositOrchestrator?: () => void;
  /**
   * Stablecoin → bond swap then open deposit (same session).
   * `expectedBondOutHuman` is the quoted bond amount used to pre-fill deposit.
   */
  onSwapAndDeposit?: (payload: {
    stableAmount: string;
    expectedBondOutHuman: string;
  }) => void | Promise<void>;
  /** While swap tx is signing / submitting */
  isSwapDepositPending?: boolean;
}

export function ReturnSimulatorStep({
  token,
  simulation,
  amount,
  onAmountChange,
  onStartDepositVault,
  onStartDepositLending,
  onStartDepositOrchestrator,
  onSwapAndDeposit,
  isSwapDepositPending = false,
}: ReturnSimulatorStepProps) {
  const { balances, address } = useWallet();
  const { light, success } = useHaptics();
  const walletConnected = Boolean(address);

  const { bondHold, depositVenue, projectionDestination, amountAssetCode } =
    simulation;

  const isYieldOnlyHold =
    Boolean(bondHold) &&
    !depositVenue &&
    projectionDestination.kind === "yield-token";

  const venue = isYieldOnlyHold
    ? projectionDestination
    : (depositVenue ?? projectionDestination);

  const isVault = venue.kind === "vault";
  const bondSymbolForEtherfuse =
    bondHold?.bondSymbol ??
    (isEtherfuseBondToken(token.code) ? token.code : null);

  const yieldsQuery = useEtherfuseYields();
  const bondQuote = useMemo(
    () =>
      bondSymbolForEtherfuse
        ? resolveEtherfuseBondApy(bondSymbolForEtherfuse, yieldsQuery.data)
        : null,
    [bondSymbolForEtherfuse, yieldsQuery.data]
  );

  const isBondToken = isEtherfuseBondToken(token.code);

  const bondSymbolResolved =
    bondHold?.bondSymbol ?? bondHold?.acceptedTokenCodes[0] ?? amountAssetCode;

  const stableFundsBondPurchase =
    Boolean(bondHold) && isStablecoinBondExplorer(token.code);

  const swapQuote = useSimulatorStablecoinBondQuote({
    stableCoinCode: token.code,
    bondSymbol: bondSymbolResolved,
    amountStableHuman: amount,
    enabled: stableFundsBondPurchase,
  });

  const summaryToken: SimulatorToken =
    bondHold && bondHold.bondSymbol
      ? { ...token, code: bondHold.bondSymbol }
      : { ...token, code: amountAssetCode };

  const walletBalanceForAmount = useMemo(() => {
    if (!token.hasWallet) return 0;
    const code = stableFundsBondPurchase ? token.code : amountAssetCode;
    return getHoldingsAmount(balances, code);
  }, [
    token.hasWallet,
    balances,
    amountAssetCode,
    stableFundsBondPurchase,
    token.code,
  ]);

  const { price, isLoading: priceLoading } = useTokenPrice(amountAssetCode);

  const { vaultApy, isLoading: apyLoading } = useVaultApy(
    isVault ? venue.id : null
  );

  const effectiveApy = useMemo(() => {
    if (isYieldOnlyHold) {
      return projectionDestination.apy;
    }

    const stackedBondLeg =
      bondQuote &&
      depositVenue &&
      bondHold &&
      (depositVenue.kind === "pool" || depositVenue.kind === "vault");

    const bondTokenDirectVenue =
      bondQuote &&
      !bondHold &&
      isBondToken &&
      (venue.kind === "pool" || venue.kind === "vault");

    if (stackedBondLeg || bondTokenDirectVenue) {
      if (venue.kind === "vault") {
        if (apyLoading && vaultApy === null) return null;
        return bondQuote!.apy + (vaultApy ?? 0);
      }
      return bondQuote!.apy + (venue.apy ?? 0);
    }

    if (venue.kind === "vault") return vaultApy;
    return venue.apy;
  }, [
    isYieldOnlyHold,
    projectionDestination.apy,
    bondQuote,
    depositVenue,
    bondHold,
    isBondToken,
    venue.kind,
    venue.apy,
    apyLoading,
    vaultApy,
  ]);

  const apy = effectiveApy;

  const stableAmountNum = useMemo(() => safeParseFloat(amount), [amount]);

  const principalBondTokens = useMemo(() => {
    if (stableFundsBondPurchase) {
      const q = swapQuote.data?.bondOutHuman;
      return typeof q === "number" && Number.isFinite(q) ? q : 0;
    }
    return stableAmountNum;
  }, [stableFundsBondPurchase, swapQuote.data?.bondOutHuman, stableAmountNum]);

  const projections = useProjectedReturns({
    principalToken: principalBondTokens,
    apy,
    tokenPriceUsd: price,
  });
  const oneYear = projections.find((p) => p.months === 12);

  const hasPrice = price > 0 && !priceLoading;
  const isWaitingForApy = isVault && apyLoading && apy === null;

  const ctaDisabled =
    stableAmountNum <= 0 ||
    isWaitingForApy ||
    principalBondTokens <= 0 ||
    (stableFundsBondPurchase &&
      stableAmountNum > 0 &&
      (swapQuote.isFetching || swapQuote.isError)) ||
    isSwapDepositPending;

  const useSwapThenDeposit =
    stableFundsBondPurchase &&
    Boolean(depositVenue) &&
    Boolean(onSwapAndDeposit);

  const canDeposit =
    Boolean(depositVenue) ||
    (!bondHold && projectionDestination.kind !== "yield-token");

  const summaryDestination: SimulatorDestination =
    isYieldOnlyHold && bondHold
      ? bondHold
      : (depositVenue ?? projectionDestination);

  const handleMax = () => {
    light();
    if (!token.hasWallet) return;
    if (walletBalanceForAmount <= 0) return;
    onAmountChange(walletBalanceForAmount.toString());
  };

  const handleDepositClick = () => {
    if (ctaDisabled || !walletConnected) return;
    if (useSwapThenDeposit) return;
    const target = depositVenue ?? projectionDestination;
    if (target.kind === "vault") {
      onStartDepositVault?.(target.raw as VaultView);
      return;
    }
    if (target.kind === "pool") {
      if (target.lendingContractId && target.lendingAssetCode) {
        onStartDepositLending?.();
        return;
      }
      onStartDepositOrchestrator?.();
      success();
    }
  };

  const handleSwapAndDepositClick = async () => {
    if (
      ctaDisabled ||
      !walletConnected ||
      !useSwapThenDeposit ||
      !onSwapAndDeposit ||
      !swapQuote.data
    ) {
      return;
    }
    const outStr = bondOutToDepositString(swapQuote.data.bondOutHuman);
    if (!outStr) return;
    try {
      await onSwapAndDeposit({
        stableAmount: amount,
        expectedBondOutHuman: outStr,
      });
      success();
    } catch (e) {
      throw e;
    }
  };

  const earningsTokenLabel = bondHold?.bondSymbol ?? amountAssetCode;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-white">
          {isYieldOnlyHold
            ? `Watch your ${earningsTokenLabel} grow`
            : "See what you could earn"}
        </h2>
        <p className="text-sm text-white/60">
          {stableFundsBondPurchase
            ? `Enter how much ${token.code} to use. We'll swap it to ${bondSymbolResolved} and deposit it for you.`
            : "Enter an amount to see your projected earnings."}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#2A2A2A] p-4">
            <label
              htmlFor="simulator-amount"
              className="text-xs font-semibold uppercase tracking-widest text-white/40"
            >
              {stableFundsBondPurchase
                ? `How much ${token.code}?`
                : "How much?"}
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="simulator-amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^0-9.]/g, "");
                  onAmountChange(next);
                }}
                className="w-full bg-transparent text-3xl font-semibold text-white outline-none placeholder:text-white/30"
              />
              <span className="flex shrink-0 items-center gap-2 text-base font-semibold text-white/80">
                {bondHold?.bondIcon &&
                isYieldOnlyHold &&
                !stableFundsBondPurchase ? (
                  <Image
                    src={bondHold.bondIcon}
                    alt={amountAssetCode}
                    width={24}
                    height={24}
                    unoptimized
                    className="rounded-full"
                  />
                ) : token.iconSrc && stableFundsBondPurchase ? (
                  <Image
                    src={token.iconSrc}
                    alt={token.code}
                    width={24}
                    height={24}
                    unoptimized
                    className="rounded-full"
                  />
                ) : null}
                {stableFundsBondPurchase ? token.code : amountAssetCode}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-1 text-xs text-white/50">
              <span>
                {token.hasWallet
                  ? `Balance: ${formatAmount(walletBalanceForAmount)} ${stableFundsBondPurchase ? token.code : amountAssetCode}`
                  : "Connect wallet to deposit or see your balance"}
              </span>
              {token.hasWallet && walletBalanceForAmount > 0 && (
                <button
                  type="button"
                  onClick={handleMax}
                  className="rounded-full bg-[#229EDF]/10 px-3 py-1 text-xs font-semibold text-[#229EDF] hover:bg-[#229EDF]/20"
                >
                  Max
                </button>
              )}
            </div>
            {stableFundsBondPurchase && stableAmountNum > 0 && (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                {swapQuote.isFetching ? (
                  <span>Fetching swap estimate…</span>
                ) : swapQuote.isError ? (
                  <span className="text-amber-200/90">
                    Could not price {token.code} → {bondSymbolResolved}. Try a
                    smaller amount or swap manually on the Swap page.
                  </span>
                ) : swapQuote.data ? (
                  <span>
                    ≈{" "}
                    <span className="font-mono font-semibold text-white">
                      {formatAmount(swapQuote.data.bondOutHuman)}{" "}
                      {bondSymbolResolved}
                    </span>{" "}
                    after swap (estimate; actual output may differ slightly).
                    Projections below use this bond amount.
                  </span>
                ) : null}
              </div>
            )}
            {bondHold &&
              token.code !== amountAssetCode &&
              bondHold.bondSymbol &&
              !stableFundsBondPurchase && (
                <p className="mt-2 text-xs text-white/45">
                  Projections are in {bondHold.bondSymbol}.
                </p>
              )}
          </div>

          <StrategySummaryCard
            token={summaryToken}
            destination={{
              ...summaryDestination,
              apy: apy ?? summaryDestination.apy,
            }}
            amount={principalBondTokens}
            apy={apy}
            oneYearProjection={oneYear}
            hasPrice={hasPrice}
          />
        </div>

        <div className="flex flex-col gap-2">
          <ProjectionTable
            projections={projections}
            tokenCode={amountAssetCode}
            hasPrice={hasPrice}
            isLoading={
              isWaitingForApy ||
              (stableFundsBondPurchase &&
                swapQuote.isFetching &&
                stableAmountNum > 0)
            }
          />
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        {!canDeposit ? (
          <button
            type="button"
            disabled={stableAmountNum <= 0}
            className={cn(
              "rounded-full px-6 py-3 text-sm font-semibold transition-colors",
              stableAmountNum <= 0
                ? "cursor-not-allowed bg-white/10 text-white/40"
                : "border border-white/15 bg-transparent text-white hover:bg-white/5"
            )}
          >
            Got it
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              useSwapThenDeposit
                ? void handleSwapAndDepositClick()
                : handleDepositClick()
            }
            disabled={ctaDisabled || !walletConnected}
            className={cn(
              "rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors",
              ctaDisabled || !walletConnected
                ? "cursor-not-allowed bg-white/10 text-white/40"
                : "bg-[#229EDF] hover:bg-[#1f8ec9]"
            )}
          >
            {!walletConnected
              ? useSwapThenDeposit
                ? "Connect wallet to swap & deposit"
                : "Connect wallet to deposit"
              : isSwapDepositPending
                ? "Swapping…"
                : useSwapThenDeposit
                  ? "Swap & deposit"
                  : "Deposit"}
          </button>
        )}
      </div>
    </section>
  );
}
