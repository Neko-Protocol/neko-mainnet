"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useVaultApy } from "@/features/vault/hooks/useVaultApy";
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
import { ProjectionTable } from "./ui/ProjectionTable";
import { StrategySummaryCard } from "./ui/StrategySummaryCard";
import type {
  SimulatorDestination,
  SimulatorToken,
} from "../types/simulator.types";
import type { VaultView } from "@/features/vault/types/vault";

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
  destination: SimulatorDestination;
  amount: string;
  onAmountChange: (next: string) => void;
  onStartEarning: (args: {
    kind: "pool" | "vault";
    poolId?: string;
    vault?: VaultView;
  }) => void;
}

export function ReturnSimulatorStep({
  token,
  destination,
  amount,
  onAmountChange,
  onStartEarning,
}: ReturnSimulatorStepProps) {
  const router = useRouter();
  const { balances } = useWallet();

  const isYieldToken = destination.kind === "yield-token";
  const isVault = destination.kind === "vault";
  const isBondToken = isEtherfuseBondToken(token.code);

  const yieldsQuery = useEtherfuseYields();
  const bondQuote = useMemo(
    () =>
      isBondToken
        ? resolveEtherfuseBondApy(token.code, yieldsQuery.data)
        : null,
    [isBondToken, token.code, yieldsQuery.data]
  );

  const amountDisplayCode =
    isYieldToken && destination.bondSymbol
      ? destination.bondSymbol
      : token.code;

  const summaryToken: SimulatorToken =
    isYieldToken && destination.bondSymbol
      ? { ...token, code: destination.bondSymbol }
      : token;

  const walletBalanceForAmount = useMemo(() => {
    if (!token.hasWallet) return 0;
    if (isYieldToken && destination.bondSymbol) {
      return getHoldingsAmount(balances, destination.bondSymbol);
    }
    return token.balance;
  }, [
    token.hasWallet,
    token.balance,
    balances,
    isYieldToken,
    destination.bondSymbol,
  ]);

  const { price, isLoading: priceLoading } = useTokenPrice(amountDisplayCode);

  const { vaultApy, isLoading: apyLoading } = useVaultApy(
    isVault ? destination.id : null
  );

  const effectiveApy = useMemo(() => {
    if (destination.kind === "yield-token") {
      return destination.apy;
    }
    if (isBondToken && bondQuote) {
      if (isVault) {
        if (apyLoading && vaultApy === null) return null;
        return bondQuote.apy + (vaultApy ?? 0);
      }
      return bondQuote.apy + (destination.apy ?? 0);
    }
    if (isVault) return vaultApy;
    return destination.apy;
  }, [
    destination.kind,
    destination.apy,
    isBondToken,
    bondQuote,
    isVault,
    apyLoading,
    vaultApy,
  ]);

  const apy = effectiveApy;

  const stackedYieldNote = useMemo(() => {
    if (!isBondToken || isYieldToken || !bondQuote) return null;
    if (isVault && apyLoading && vaultApy === null) return null;
    const bondPct = bondQuote.apy.toFixed(2);
    if (isVault) {
      const v =
        vaultApy !== null && vaultApy !== undefined
          ? vaultApy.toFixed(2)
          : "0.00";
      const sum = (bondQuote.apy + (vaultApy ?? 0)).toFixed(2);
      return `Approximate combined yield: ${bondPct}% bond + ${v}% vault = ${sum}% yearly (percentages added; actual compounding may differ).`;
    }
    const p = destination.apy;
    const poolPct = p !== null && p !== undefined ? p.toFixed(2) : "0.00";
    const sum = (bondQuote.apy + (destination.apy ?? 0)).toFixed(2);
    return `Approximate combined yield: ${bondPct}% bond + ${poolPct}% pool = ${sum}% yearly (percentages added; actual compounding may differ).`;
  }, [
    isBondToken,
    isYieldToken,
    bondQuote,
    isVault,
    apyLoading,
    vaultApy,
    destination.apy,
  ]);

  const projectionFooterExtra = useMemo(() => {
    if (!isBondToken || isYieldToken || !bondQuote) return null;
    return "Combined rate sums sovereign bond APR and this venue's APR as a simple additive estimate.";
  }, [isBondToken, isYieldToken, bondQuote]);

  const principal = useMemo(() => safeParseFloat(amount), [amount]);
  const projections = useProjectedReturns({
    principalToken: principal,
    apy,
    tokenPriceUsd: price,
  });
  const oneYear = projections.find((p) => p.months === 12);

  const hasPrice = price > 0 && !priceLoading;
  const isWaitingForApy = isVault && apyLoading && apy === null;
  const ctaDisabled = principal <= 0 || isWaitingForApy;

  const handleMax = () => {
    if (!token.hasWallet) return;
    if (walletBalanceForAmount <= 0) return;
    onAmountChange(walletBalanceForAmount.toString());
  };

  const handleStart = () => {
    if (ctaDisabled) return;
    if (isVault) {
      onStartEarning({ kind: "vault", vault: destination.raw as VaultView });
    } else if (destination.lendingContractId && destination.lendingAssetCode) {
      router.push(
        `/pools?supply=${encodeURIComponent(destination.lendingAssetCode)}`
      );
      onStartEarning({ kind: "pool", poolId: destination.id });
    } else {
      router.push(`/pools/${encodeURIComponent(destination.id)}`);
      onStartEarning({ kind: "pool", poolId: destination.id });
    }
  };

  const earningsTokenLabel =
    isYieldToken && destination.bondSymbol
      ? destination.bondSymbol
      : token.code;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-white">
          {isYieldToken
            ? "Project yield while you hold"
            : "See what you could earn"}
        </h2>
        <p className="text-sm text-white/60">
          {isYieldToken
            ? "The token is already yield-bearing. Adjust the amount to see how balance and value might grow over time."
            : isBondToken
              ? "Adjust the amount to see projected growth. For bond tokens in a pool or vault, bond APR and venue APR are added to approximate total yearly growth."
              : "Adjust the amount to see your projected earnings over time."}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#2A2A2A] p-4">
            <label
              htmlFor="simulator-amount"
              className="text-xs font-semibold uppercase tracking-widest text-white/40"
            >
              How much?
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
                {destination.bondIcon && isYieldToken ? (
                  <Image
                    src={destination.bondIcon}
                    alt={amountDisplayCode}
                    width={24}
                    height={24}
                    unoptimized
                    className="rounded-full"
                  />
                ) : null}
                {amountDisplayCode}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-white/50">
              <span>
                {token.hasWallet
                  ? `Balance: ${formatAmount(walletBalanceForAmount)} ${amountDisplayCode}`
                  : "Connect wallet to see your balance"}
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
            {isYieldToken &&
              token.code !== amountDisplayCode &&
              destination.bondSymbol && (
                <p className="mt-2 text-xs text-white/45">
                  Amount is in {destination.bondSymbol}. You picked {token.code}{" "}
                  in step 1 to explore bond options.
                </p>
              )}
          </div>

          <StrategySummaryCard
            token={summaryToken}
            destination={{ ...destination, apy: apy ?? destination.apy }}
            amount={principal}
            apy={apy}
            oneYearProjection={oneYear}
            hasPrice={hasPrice}
            isYieldBearingBond={isYieldToken || isBondToken}
            stackedYieldNote={
              !isYieldToken && isBondToken ? stackedYieldNote : null
            }
          />
        </div>

        <div className="flex flex-col gap-2">
          <ProjectionTable
            projections={projections}
            tokenCode={amountDisplayCode}
            hasPrice={hasPrice}
            isLoading={isWaitingForApy}
            isYieldBearingBond={isYieldToken || isBondToken}
            extraFooterNote={projectionFooterExtra}
          />
          {isYieldToken && destination.bondCurrency && (
            <p className="text-xs text-white/50">
              These are {destination.bondCurrency}-denominated returns. What you
              see as &ldquo;earned&rdquo; includes both more{" "}
              {earningsTokenLabel} and each token tending to be worth more over
              time. You can redeem {earningsTokenLabel} for{" "}
              {destination.bondCurrency} when you like via Etherfuse.
            </p>
          )}
          {isBondToken && !isYieldToken && bondQuote && (
            <p className="text-xs text-white/50">
              Bond leg ~{bondQuote.apy.toFixed(2)}% APR (
              {bondQuote.bondCurrency} oriented, Etherfuse) plus this{" "}
              {isVault ? "vault" : "pool"}
              &apos;s APR feeds the combined rate above. Figures are
              illustrative; markets and compounding paths differ in practice.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        {isYieldToken ? (
          <button
            type="button"
            disabled={principal <= 0}
            className={cn(
              "rounded-full px-6 py-3 text-sm font-semibold transition-colors",
              principal <= 0
                ? "cursor-not-allowed bg-white/10 text-white/40"
                : "border border-white/15 bg-transparent text-white hover:bg-white/5"
            )}
          >
            Got it
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            disabled={ctaDisabled}
            className={cn(
              "rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors",
              ctaDisabled
                ? "cursor-not-allowed bg-white/10 text-white/40"
                : "bg-[#229EDF] hover:bg-[#1f8ec9]"
            )}
          >
            Start Earning
          </button>
        )}
      </div>
    </section>
  );
}
