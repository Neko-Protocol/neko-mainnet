"use client";

import React, { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { sanitizeAmountInput } from "@/lib/helpers/tokenUtils";
import { formatCurrency } from "@/lib/helpers/currency";
import type { SupportedCurrency } from "@/stores/currency.store";
import { useMultisigDetection } from "@/hooks/useMultisigDetection";
import { MultisigBanner } from "@/features/shared/vault/components/ui/MultisigBanner";
import type { VaultActionPanelProps } from "./types";

function formatBalance(n: number): string {
  if (n === 0) return "0";
  return parseFloat(n.toFixed(2)).toString();
}

export function AnimatedValue({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState(value);
  const [exiting, setExiting] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === displayed) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const previous = displayed;
    const frame = requestAnimationFrame(() => {
      setExiting(previous);
      setDisplayed(value);
      timerRef.current = setTimeout(() => setExiting(null), 2600);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, displayed]);

  return (
    <span
      className="relative inline-block overflow-hidden leading-none"
      style={{ verticalAlign: "middle" }}
    >
      {exiting !== null && (
        <span className={`animate-value-exit ${className ?? ""}`}>
          {exiting}
        </span>
      )}
      <span
        key={displayed}
        className={`inline-block animate-value-enter ${className ?? ""}`}
      >
        {displayed}
      </span>
    </span>
  );
}

function TokenIcon({
  src,
  alt,
  size = 16,
}: {
  src: string;
  alt: string;
  size?: number;
}) {
  return (
    <div
      className="rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0"
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        unoptimized
        className="h-full w-full object-contain"
      />
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/50 text-sm">{label}</span>
      <div className="text-sm tabular-nums">{value}</div>
    </div>
  );
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
  to: string;
  hasAmount: boolean;
}) {
  const fromIsZero = parseFloat(from.replace(/[^0-9.]/g, "") || "0") === 0;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-white/50 text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-1 text-sm tabular-nums">
        {hasAmount ? (
          <>
            {!fromIsZero && (
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

function AmountInputCard({
  tab,
  supplyLabel,
  supplyIconSrc,
  amount,
  onAmountChange,
  currencyValue,
  selectedCurrency,
  balanceForDisplay,
  maxAmount,
  hasAmount,
}: {
  tab: "deposit" | "withdraw";
  supplyLabel: string;
  supplyIconSrc: string;
  amount: string;
  onAmountChange: (v: string) => void;
  currencyValue: number | null;
  selectedCurrency: SupportedCurrency;
  balanceForDisplay: string;
  maxAmount: string;
  hasAmount: boolean;
}) {
  return (
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
        <TokenIcon src={supplyIconSrc} alt={supplyLabel} size={28} />
      </div>

      <input
        type="text"
        inputMode="decimal"
        placeholder="0"
        value={amount}
        onChange={(e) => onAmountChange(sanitizeAmountInput(e.target.value))}
        className="w-full bg-transparent text-white font-medium outline-none placeholder:text-white/20 mb-3"
        style={{
          fontSize: 33,
          fontFamily: '"FK Grotesk", "Inter", sans-serif',
        }}
      />

      <div className="flex items-center justify-between">
        <AnimatedValue
          value={formatCurrency(currencyValue ?? 0, selectedCurrency, 2)}
          className={`text-sm tabular-nums ${currencyValue != null ? "text-white/50" : "text-white/20"}`}
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
  );
}

function DepositSummary({
  supplyLabel,
  supplyIconSrc,
  currentDeposited,
  newDepositedTotal,
  hasAmount,
  hasInsufficientBalance,
  apyNum,
  apy,
  projectedMonthly,
  projectedYearly,
  selectedCurrency,
}: {
  supplyLabel: string;
  supplyIconSrc: string;
  currentDeposited: number;
  newDepositedTotal: number;
  hasAmount: boolean;
  hasInsufficientBalance: boolean;
  apyNum: number | null;
  apy?: string;
  projectedMonthly: number;
  projectedYearly: number;
  selectedCurrency: SupportedCurrency;
}) {
  return (
    <div
      className="rounded-2xl border border-white/5 px-4 py-3.5 space-y-3.5"
      style={{ background: "#1a1a1a" }}
    >
      <InfoRow
        label="Network"
        value={
          <div className="flex items-center gap-1.5">
            <Image
              src="/assets/xlm-negro-logo.png"
              alt="Stellar"
              width={14}
              height={14}
              unoptimized
              className="w-3.5 h-3.5 rounded-sm invert"
            />
            <span className="text-white/80 font-medium">Stellar</span>
          </div>
        }
      />

      <ArrowRow
        label={`Deposit (${supplyLabel})`}
        icon={<TokenIcon src={supplyIconSrc} alt={supplyLabel} size={16} />}
        from={formatBalance(currentDeposited)}
        to={formatBalance(newDepositedTotal)}
        hasAmount={hasAmount}
      />

      {hasInsufficientBalance && (
        <p className="text-red-400 text-xs">Insufficient balance</p>
      )}

      {apyNum != null && (
        <InfoRow
          label="APY"
          value={<span className="text-white font-semibold">{apy}</span>}
        />
      )}

      {apyNum != null && (
        <InfoRow
          label="Projected monthly earnings"
          value={
            <AnimatedValue
              value={formatCurrency(projectedMonthly, selectedCurrency, 2)}
              className="text-white font-semibold"
            />
          }
        />
      )}

      {apyNum != null && (
        <InfoRow
          label="Projected yearly earnings"
          value={
            <AnimatedValue
              value={formatCurrency(projectedYearly, selectedCurrency, 2)}
              className="text-white font-semibold"
            />
          }
        />
      )}
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
  isConfirming = false,
  supplyBalance,
  withdrawBalance,
  isWalletConnected,
  apy,
  tokenPriceInCurrency,
  selectedCurrency = "USD",
}: VaultActionPanelProps) {
  const { data: multisigInfo } = useMultisigDetection();
  const supplyLabel = vault.supplyAsset.symbol;
  const hasAmount = !!amount && parseFloat(amount) > 0;
  const depositAmt = parseFloat(amount) || 0;
  const currentDeposited = parseFloat(withdrawBalance) || 0;

  const apyNum =
    apy && apy !== "-" && apy !== "" ? parseFloat(apy.replace("%", "")) : null;

  const tokenPrice = tokenPriceInCurrency ?? 1;
  const currencyValue = depositAmt > 0 ? depositAmt * tokenPrice : null;

  // newDepositedTotal naturally equals currentDeposited when no amount is entered
  const newDepositedTotal = currentDeposited + depositAmt;
  const projectedMonthly = apyNum
    ? newDepositedTotal * (apyNum / 100 / 12) * tokenPrice
    : 0;
  const projectedYearly = apyNum
    ? newDepositedTotal * (apyNum / 100) * tokenPrice
    : 0;

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

  const maxAmount = tab === "deposit" ? supplyBalance : withdrawBalance;
  const balanceForDisplay =
    tab === "deposit"
      ? `${formatBalance(parseFloat(supplyBalance))} ${supplyLabel}`
      : `${formatBalance(parseFloat(withdrawBalance))} ${supplyLabel}`;

  const ctaLabel =
    multisigInfo?.isMultisig && isWalletConnected
      ? "Send to Lobstr Vault"
      : tab === "deposit"
        ? `Deposit ${supplyLabel}`
        : `Withdraw ${supplyLabel}`;

  return (
    <div className="flex flex-col gap-3">
      {multisigInfo?.isMultisig && (
        <MultisigBanner
          signersCount={multisigInfo.signersCount}
          threshold={multisigInfo.medThreshold}
        />
      )}
      <ModeTabs tab={tab} onTabChange={onTabChange} />

      <AmountInputCard
        tab={tab}
        supplyLabel={supplyLabel}
        supplyIconSrc={vault.supplyAsset.iconSrc}
        amount={amount}
        onAmountChange={onAmountChange}
        currencyValue={currencyValue}
        selectedCurrency={selectedCurrency}
        balanceForDisplay={balanceForDisplay}
        maxAmount={maxAmount}
        hasAmount={hasAmount}
      />

      {(depositExceedsBalance || withdrawExceedsBalance) && (
        <p className="text-red-400 text-xs px-1">Insufficient balance</p>
      )}

      {tab === "deposit" && (
        <DepositSummary
          supplyLabel={supplyLabel}
          supplyIconSrc={vault.supplyAsset.iconSrc}
          currentDeposited={currentDeposited}
          newDepositedTotal={newDepositedTotal}
          hasAmount={hasAmount}
          hasInsufficientBalance={depositExceedsBalance}
          apyNum={apyNum}
          apy={apy}
          projectedMonthly={projectedMonthly}
          projectedYearly={projectedYearly}
          selectedCurrency={selectedCurrency}
        />
      )}

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
        ) : (
          ctaLabel
        )}
      </button>

      {isLoading && (
        <p className="text-white/40 text-xs text-center mt-1">
          {isConfirming
            ? "Confirming on network…"
            : "Please confirm in your wallet"}
        </p>
      )}
    </div>
  );
}
