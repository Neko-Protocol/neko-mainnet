"use client";

import React, { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { sanitizeAmountInput } from "@/lib/helpers/tokenUtils";
import type { VaultActionPanelProps } from "./types";

function formatProjection(value: number): string {
  if (value <= 0) return "0";
  if (value < 0.01) return "< 0.01";
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function formatBalance(n: number): string {
  if (n === 0) return "0";
  const s = n.toFixed(7);
  return parseFloat(s).toString();
}

function ArrowRow({
  label,
  icon,
  from,
  to,
  hasAmount,
}: {
  label: string;
  icon?: React.ReactNode;
  from: string;
  to?: string;
  hasAmount: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-white/50 text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-1 text-sm tabular-nums">
        {hasAmount && to !== undefined ? (
          <>
            {from !== "0" && from !== "$0" && (
              <>
                <span className="text-white/40">{from}</span>
                <span className="text-white/30 mx-0.5">→</span>
              </>
            )}
            <AnimatedValue value={to} className="text-white font-semibold" />
          </>
        ) : (
          <span className="text-white/40">{from}</span>
        )}
      </div>
    </div>
  );
}

function ModeTabs({
  tab,
  onTabChange,
}: Pick<VaultActionPanelProps, "tab" | "onTabChange">) {
  return (
    <div className="flex bg-white/6 rounded-xl p-1 gap-1 mb-4">
      {(["deposit", "withdraw"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onTabChange(t)}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
            tab === t
              ? "bg-[#229EDF] text-white"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function AnimatedValue({ value, className }: { value: string; className?: string }) {
  const [displayed, setDisplayed] = useState(value);
  const [exiting, setExiting] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === displayed) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setExiting(displayed);
    setDisplayed(value);
    timerRef.current = setTimeout(() => setExiting(null), 2600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span className="relative inline-block overflow-hidden leading-none" style={{ verticalAlign: "middle" }}>
      {exiting !== null && (
        <span className={`animate-value-exit ${className ?? ""}`}>{exiting}</span>
      )}
      <span key={displayed} className={`inline-block animate-value-enter ${className ?? ""}`}>
        {displayed}
      </span>
    </span>
  );
}

function TokenIcon({ src, alt, size = 16 }: { src: string; alt: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0"
      style={{ width: size, height: size }}
    >
      <Image src={src} alt={alt} width={size} height={size} unoptimized className="h-full w-full object-contain" />
    </div>
  );
}

export function VaultActionPanel({
  vault,
  tab,
  onTabChange,
  amount,
  onAmountChange,
  onSubmit,
  isLoading,
  supplyBalance,
  sharesBalance,
  isWalletConnected,
  apy,
  tokenPriceUsd,
}: VaultActionPanelProps) {
  const supplyLabel = vault.supplyAsset.symbol;
  const hasAmount = !!amount && parseFloat(amount) > 0;
  const depositAmt = parseFloat(amount) || 0;
  const currentDeposited = parseFloat(sharesBalance) || 0;

  const apyNum =
    apy && apy !== "-" && apy !== ""
      ? parseFloat(apy.replace("%", ""))
      : null;

  const usdValue =
    tokenPriceUsd && depositAmt > 0 ? depositAmt * tokenPriceUsd : null;

  const currentMonthly =
    apyNum && currentDeposited > 0
      ? currentDeposited * (apyNum / 100 / 12)
      : 0;
  const currentYearly =
    apyNum && currentDeposited > 0 ? currentDeposited * (apyNum / 100) : 0;

  const newDepositedTotal = currentDeposited + depositAmt;
  const newMonthly = apyNum ? newDepositedTotal * (apyNum / 100 / 12) : 0;
  const newYearly = apyNum ? newDepositedTotal * (apyNum / 100) : 0;

  const depositExceedsBalance =
    tab === "deposit" &&
    hasAmount &&
    parseFloat(amount) > parseFloat(supplyBalance) + 1e-10;

  const withdrawExceedsBalance =
    tab === "withdraw" &&
    hasAmount &&
    parseFloat(amount) > currentDeposited + 1e-10;

  const isDisabled =
    !isWalletConnected ||
    isLoading ||
    !hasAmount ||
    depositExceedsBalance ||
    withdrawExceedsBalance;

  const maxAmount = tab === "deposit" ? supplyBalance : sharesBalance;
  const balanceForDisplay =
    tab === "deposit"
      ? `${formatBalance(parseFloat(supplyBalance))} ${supplyLabel}`
      : `${formatBalance(parseFloat(sharesBalance))} ${supplyLabel}`;

  return (
    <div className="flex flex-col gap-3">
      <ModeTabs tab={tab} onTabChange={onTabChange} />

      {/* Input card */}
      <div
        className={`rounded-2xl border p-4 transition-colors ${
          hasAmount ? "border-[#229EDF]/70" : "border-white/10"
        }`}
        style={{ background: "#1a1a1a" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/60 text-sm font-medium">
            {tab === "deposit" ? "Deposit" : "Withdraw"} {supplyLabel}
          </span>
          <TokenIcon src={vault.supplyAsset.iconSrc} alt={supplyLabel} size={28} />
        </div>

        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => onAmountChange(sanitizeAmountInput(e.target.value))}
          className="w-full bg-transparent text-white font-medium outline-none placeholder:text-white/20 mb-3"
          style={{ fontSize: 33, fontFamily: '"FK Grotesk", "Inter", sans-serif' }}
        />

        <div className="flex items-center justify-between">
          <AnimatedValue
            value={usdValue != null ? `$${usdValue.toFixed(2)}` : "$0.00"}
            className={`text-sm tabular-nums ${usdValue != null ? "text-white/50" : "text-white/20"}`}
          />
          <div className="flex items-center gap-2">
            <span className="text-white/35 text-sm tabular-nums">
              {balanceForDisplay}
            </span>
            <button
              type="button"
              onClick={() => onAmountChange(maxAmount)}
              className="px-2.5 py-1 rounded-lg bg-white/10 text-white/60 text-xs font-semibold hover:bg-white/15 transition-colors"
            >
              MAX
            </button>
          </div>
        </div>
      </div>

      {(depositExceedsBalance || withdrawExceedsBalance) && (
        <p className="text-red-400 text-xs px-1">Insufficient balance</p>
      )}

      {/* Summary card */}
      <div
        className="rounded-2xl border border-white/5 px-4 py-3.5 space-y-3.5"
        style={{ background: "#1a1a1a" }}
      >
        {/* Network */}
        <div className="flex items-center justify-between">
          <span className="text-white/50 text-sm">Network</span>
          <div className="flex items-center gap-1.5">
            <Image
              src="/assets/xlm-negro-logo.png"
              alt="Stellar"
              width={14}
              height={14}
              unoptimized
              className="w-3.5 h-3.5 rounded-sm invert"
            />
            <span className="text-white/80 text-sm font-medium">Stellar</span>
          </div>
        </div>

        {/* Deposit / Withdraw amount */}
        <ArrowRow
          label={`${tab === "deposit" ? "Deposit" : "Withdraw"} (${supplyLabel})`}
          icon={
            <TokenIcon src={vault.supplyAsset.iconSrc} alt={supplyLabel} size={16} />
          }
          from={formatBalance(currentDeposited)}
          to={
            tab === "deposit"
              ? formatBalance(newDepositedTotal)
              : formatBalance(Math.max(0, currentDeposited - depositAmt))
          }
          hasAmount={hasAmount}
        />

        {/* Deposit-only rows */}
        {tab === "deposit" && (
          <>
            {apyNum != null && (
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">APY</span>
                <span className="text-white font-semibold text-sm">{apy}</span>
              </div>
            )}

            {apyNum != null && (
              <ArrowRow
                label="Projected monthly earnings"
                from={`$${formatProjection(currentMonthly)}`}
                to={`$${formatProjection(newMonthly)}`}
                hasAmount={hasAmount}
              />
            )}

            {apyNum != null && (
              <ArrowRow
                label="Projected yearly earnings"
                from={`$${formatProjection(currentYearly)}`}
                to={`$${formatProjection(newYearly)}`}
                hasAmount={hasAmount}
              />
            )}
          </>
        )}
      </div>

      {/* Submit button */}
      <button
        type="button"
        onClick={() => void onSubmit()}
        disabled={isDisabled}
        className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-colors duration-200 bg-[#229EDF] hover:bg-[#1a8bc7] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {tab === "deposit" ? `Depositing ${supplyLabel}…` : "Withdrawing…"}
          </>
        ) : !isWalletConnected ? (
          "Connect wallet"
        ) : tab === "deposit" ? (
          `Deposit ${supplyLabel}`
        ) : (
          "Withdraw"
        )}
      </button>

      {isLoading && (
        <p className="text-white/40 text-xs text-center mt-1">
          Please confirm in your wallet
        </p>
      )}
    </div>
  );
}
