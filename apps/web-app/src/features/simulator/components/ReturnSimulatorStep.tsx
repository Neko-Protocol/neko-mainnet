"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useHaptics } from "@/hooks/useHaptics";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useFxRate } from "@/hooks/useFxRate";
import { useVaultApy } from "@/features/shared/vault/hooks/useVaultApy";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";
import { formatAmount, safeParseFloat } from "@/lib/helpers/formatUtils";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { getTokenIcon, getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import type { MappedBalances } from "@/lib/helpers/stellar/wallet";
import { useCurrencyStore } from "@/stores/currency.store";
import { useEtherfuseYields } from "../hooks/useEtherfuseYields";
import {
  isEtherfuseBondToken,
  resolveEtherfuseBondApy,
} from "../hooks/useFilteredDestinations";
import { useProjectedReturns } from "../hooks/useProjectedReturns";
import { useSimulatorStablecoinBondQuote } from "../hooks/useSimulatorStablecoinBondQuote";
import type {
  Projection,
  SimulatorDestination,
  SimulatorToken,
} from "../types/simulator.types";
import {
  isStablecoinBondExplorer,
  type SimulationResolved,
} from "../utils/wizardPhases";
import type { VaultView } from "@/features/shared/vault/types/vault";

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

// ── Sub-components ──────────────────────────────────────────────────────────

function StrategyRecap({
  token,
  destination,
  apy,
  isLoading,
}: {
  token: SimulatorToken;
  destination: SimulatorDestination;
  apy: number | null;
  isLoading: boolean;
}) {
  const iconSrc = getTokenIcon(token.code) ?? token.iconSrc;
  const hasPositiveApy = apy !== null && !Number.isNaN(apy) && apy > 0;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#1E1E1E] px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-white/10">
        {iconSrc ? (
          <Image
            src={iconSrc}
            alt={token.code}
            width={36}
            height={36}
            unoptimized
            className={getTokenIconFitClass(token.code)}
          />
        ) : (
          <span className="text-xs font-bold text-[#121212]">
            {token.code[0]}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
        <span className="font-semibold text-white">{token.code}</span>
        <span className="text-white/30">→</span>
        <span className="truncate font-medium text-white/70">
          {destination.name}
        </span>
        <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/50">
          {destination.protocol}
        </span>
      </div>

      <div className="shrink-0 text-right">
        {isLoading ? (
          <div className="h-5 w-14 rounded bg-white/10" />
        ) : hasPositiveApy ? (
          <span className="text-sm font-bold text-[#4ADE80]">
            {apy!.toFixed(2)}%
          </span>
        ) : (
          <span className="text-sm font-bold text-white/30">-</span>
        )}
        <p className="text-[10px] text-white/30">APY</p>
      </div>
    </div>
  );
}

function EarningsPanel({
  projections,
  tokenCode,
  hasPrice,
  isLoading,
}: {
  projections: Projection[];
  tokenCode: string;
  hasPrice: boolean;
  isLoading: boolean;
}) {
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });

  const fmtFiat = (usd: number) =>
    hasPrice
      ? formatCurrency(convertUsdToSelected(usd, fxRate), selectedCurrency)
      : null;

  const oneYear = projections.find((p) => p.months === 12);
  const others = projections.filter((p) => p.months !== 12);

  return (
    <div className="flex flex-col gap-3">
      {/* Hero: 1-year earnings */}
      <div className="rounded-2xl border border-white/8 bg-[#1E1E1E] px-5 py-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">
          Projected after 1 year
        </p>
        {isLoading ? (
          <div className="h-10 w-40 rounded-lg bg-white/10" />
        ) : oneYear ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {hasPrice ? (
              <>
                <span className="text-4xl font-bold tabular-nums text-[#4ADE80]">
                  +{fmtFiat(oneYear.earningsUsd)}
                </span>
                <span className="text-base font-medium text-white/40">
                  +{formatAmount(oneYear.earningsToken)} {tokenCode}
                </span>
              </>
            ) : (
              <span className="text-4xl font-bold tabular-nums text-[#4ADE80]">
                +{formatAmount(oneYear.earningsToken)} {tokenCode}
              </span>
            )}
          </div>
        ) : null}
        <p className="mt-3 text-xs text-white/30">
          Estimate based on current rate. Actual returns will vary.
        </p>
      </div>

      {/* 1 month + 6 months chips */}
      <div className="grid grid-cols-2 gap-3">
        {others.map((p) => (
          <div
            key={p.periodLabel}
            className="rounded-xl border border-white/8 bg-[#1E1E1E] px-4 py-3"
          >
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">
              {p.periodLabel}
            </p>
            {isLoading ? (
              <div className="h-5 w-20 rounded bg-white/10" />
            ) : (
              <>
                <p className="text-base font-bold tabular-nums text-white">
                  {hasPrice
                    ? `+${fmtFiat(p.earningsUsd)}`
                    : `+${formatAmount(p.earningsToken)} ${tokenCode}`}
                </p>
                {hasPrice && (
                  <p className="text-xs text-white/35">
                    +{formatAmount(p.earningsToken)} {tokenCode}
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface ReturnSimulatorStepProps {
  token: SimulatorToken;
  simulation: SimulationResolved;
  amount: string;
  onAmountChange: (next: string) => void;
  onStartDepositVault?: (vault: VaultView) => void;
  onStartDepositLending?: () => void;
  onStartDepositOrchestrator?: () => void;
  onSwapAndDeposit?: (payload: {
    stableAmount: string;
    expectedBondOutHuman: string;
  }) => void | Promise<void>;
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
    if (isYieldOnlyHold) return projectionDestination.apy;

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

  const earningsTokenLabel = bondHold?.bondSymbol ?? amountAssetCode;

  const [projectionsOpen, setProjectionsOpen] = useState(false);
  const selectedCurrencyMain = useCurrencyStore((s) => s.selectedCurrency);
  const { rate: fxRateMain } = useFxRate({ currency: selectedCurrencyMain });
  const oneYear = projections.find((p) => p.months === 12);
  const oneYearLabel = useMemo(() => {
    if (!oneYear) return null;
    if (hasPrice) {
      return `+${formatCurrency(convertUsdToSelected(oneYear.earningsUsd, fxRateMain), selectedCurrencyMain)}`;
    }
    return `+${formatAmount(oneYear.earningsToken)} ${amountAssetCode}`;
  }, [oneYear, hasPrice, fxRateMain, selectedCurrencyMain, amountAssetCode]);

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

  return (
    <>
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
          <div className="flex flex-col gap-5 pb-2">
            {/* Header */}
            <header className="flex shrink-0 flex-col gap-1">
              <h2 className="text-xl font-semibold text-white">
                {isYieldOnlyHold
                  ? `Watch your ${earningsTokenLabel} grow`
                  : "See what you could earn"}
              </h2>
              <p className="text-sm text-white/50">
                {stableFundsBondPurchase
                  ? `Enter how much ${token.code} to use. We'll swap it to ${bondSymbolResolved} and deposit it for you.`
                  : "Enter an amount to see your projected earnings."}
              </p>
            </header>

            {/* Strategy recap */}
            <StrategyRecap
              token={summaryToken}
              destination={summaryDestination}
              apy={apy}
              isLoading={isWaitingForApy}
            />

            {/* Amount input */}
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
                    : "Connect wallet to deposit"}
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
                    </span>
                  ) : null}
                </div>
              )}

              {bondHold &&
                token.code !== amountAssetCode &&
                bondHold.bondSymbol &&
                !stableFundsBondPurchase && (
                  <p className="mt-2 text-xs text-white/40">
                    Projections are in {bondHold.bondSymbol}.
                  </p>
                )}
            </div>

            {/* Compact earnings preview - only shown when amount entered */}
            {stableAmountNum > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#1E1E1E] px-4 py-3">
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                    After 1 year
                  </p>
                  {isWaitingForApy ||
                  (stableFundsBondPurchase && swapQuote.isFetching) ? (
                    <div className="h-6 w-24 rounded bg-white/10" />
                  ) : (
                    <p className="text-xl font-bold tabular-nums text-[#4ADE80]">
                      {oneYearLabel ?? "-"}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* end inner flex col */}
        </div>
        {/* end scrollable area */}

        {/* CTA - pinned at bottom, never scrolls away */}
        <div className="shrink-0 border-t border-white/8 pt-4 flex items-center justify-between gap-3">
          {/* Secondary: see breakdown */}
          {stableAmountNum > 0 ? (
            <button
              type="button"
              onClick={() => setProjectionsOpen(true)}
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white"
            >
              See breakdown
            </button>
          ) : (
            <div />
          )}

          {/* Primary: deposit / got it */}
          {!canDeposit ? (
            <button
              type="button"
              disabled={stableAmountNum <= 0}
              className={cn(
                "rounded-full px-6 py-2.5 text-sm font-semibold transition-colors",
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
                "rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-colors",
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

      {/* Projections modal */}
      {projectionsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setProjectionsOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#1C1C1C] p-6 sm:rounded-3xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                Earnings breakdown
              </h3>
              <button
                type="button"
                onClick={() => setProjectionsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <EarningsPanel
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
      )}
    </>
  );
}
