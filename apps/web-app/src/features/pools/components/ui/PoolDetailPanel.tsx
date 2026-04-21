"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Copy, Check, Globe } from "lucide-react";
import { getPoolTokenIcon } from "../../utils/poolTokenIcons";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import { useTokenPrice } from "@/hooks/useTokenPrice";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PoolDetailPanelToken {
  symbol: string;
  icon?: string | null;
  address?: string;
}

export interface PoolDetailPanelPool {
  id: string;
  name: string;
  token1: PoolDetailPanelToken;
  token2: PoolDetailPanelToken;
  liquidationLtv: number;
  contractAddress: string;
  network: string;
  totalLiquidity: string;
  totalLiquidityRaw?: string;
  /** Formatted total supply / LP yield (e.g. AMM APY) */
  supplyApy: string;
  /** Optional subline, e.g. base + rewards breakdown for Aqua */
  supplyApySub?: string;
  /** Lending pool borrow APY (e.g. Blend); shown when present */
  borrowApyLabel?: string;
  issuer: { name: string; icon?: string | null };
  collateralBalance?: string;
  loanBalance?: string;
  currentLtv?: number;
  token1Balance?: string;
  /** LP / pool shares (max for withdraw) */
  lpBalance?: string;
  borrowLimit?: string;
}

interface PoolDetailPanelProps {
  pool: PoolDetailPanelPool;
  type: "lend" | "borrow";
  isWalletConnected?: boolean;
  supportsBorrow?: boolean;
  /** AMM / Neko: only deposit+withdraw, no protocol borrow */
  depositWithdrawMode?: boolean;
  ammTab?: "deposit" | "withdraw";
  onAmmTabChange?: (t: "deposit" | "withdraw") => void;
  ammAmount?: string;
  onAmmAmountChange?: (v: string) => void;
  onAmmSubmit?: () => void | Promise<void>;
  isAmmSubmitting?: boolean;
  ammSubmitDisabled?: boolean;
  ammInsufficientFundsMessage?: string | null;
  canLend?: boolean;
  canBorrow?: boolean;
  onLendSubmit?: (supplyAmount: string) => void | Promise<void>;
  onBorrowSubmit?: (borrowAmount: string) => void | Promise<void>;
  isLendingActionPending?: boolean;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function OverlappingTokens({
  token1,
  token2,
  size = "md",
}: {
  token1: PoolDetailPanelToken;
  token2: PoolDetailPanelToken;
  size?: "md" | "lg";
}) {
  const circle = size === "lg" ? "w-16 h-16" : "w-10 h-10";
  const offset = size === "lg" ? "left-10" : "left-6";
  const wrap = size === "lg" ? "w-24 h-16" : "w-16 h-10";
  const px = size === "lg" ? 64 : 40;

  return (
    <div className={`relative ${wrap} shrink-0 flex items-center`}>
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 ${circle} rounded-full bg-neko-teal border-2 border-neko-border flex items-center justify-center overflow-hidden shadow-md z-1`}
      >
        {(() => {
          const icon =
            token1.icon ??
            getPoolTokenIcon({ type: "contract", code: token1.symbol });
          return icon ? (
            <Image
              src={icon}
              alt={token1.symbol}
              width={px}
              height={px}
              unoptimized
              className={getTokenIconFitClass(token1.symbol)}
            />
          ) : (
            <span className="text-white font-bold" style={{ fontSize: px / 3 }}>
              {token1.symbol[0]}
            </span>
          );
        })()}
      </div>
      <div
        className={`absolute ${offset} top-1/2 -translate-y-1/2 ${circle} rounded-full bg-neko-teal-light border-2 border-neko-border flex items-center justify-center overflow-hidden shadow-md z-2`}
      >
        {(() => {
          const icon =
            token2.icon ??
            getPoolTokenIcon({ type: "contract", code: token2.symbol });
          return icon ? (
            <Image
              src={icon}
              alt={token2.symbol}
              width={px}
              height={px}
              unoptimized
              className={getTokenIconFitClass(token2.symbol)}
            />
          ) : (
            <span
              className="text-neko-navy font-bold"
              style={{ fontSize: px / 3 }}
            >
              {token2.symbol[0]}
            </span>
          );
        })()}
      </div>
    </div>
  );
}

function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors group"
    >
      <span className="font-mono text-xs">{short}</span>
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3 group-hover:text-white/50" />
      )}
    </button>
  );
}

function AmountInput({
  label,
  token,
  value,
  onChange,
  balanceLabel,
  balanceValue,
  onMax,
  disabled,
  usdValue,
}: {
  label: string;
  token: PoolDetailPanelToken;
  value: string;
  onChange: (v: string) => void;
  balanceLabel: string;
  balanceValue: string;
  onMax?: () => void;
  disabled?: boolean;
  usdValue?: string;
}) {
  const resolvedIcon =
    token.icon ?? getPoolTokenIcon({ type: "contract", code: token.symbol });

  return (
    <div
      className="rounded-xl border border-white/10 bg-[#1C1C1C] p-4 focus-within:border-[#229EDF]/40 transition-colors"
      style={{ borderWidth: 1 }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/50 text-xs font-medium">{label}</p>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-[#2A2A2A] flex items-center justify-center overflow-hidden shrink-0">
            {resolvedIcon ? (
              <Image
                src={resolvedIcon}
                alt={token.symbol}
                width={20}
                height={20}
                unoptimized
                className={getTokenIconFitClass(token.symbol)}
              />
            ) : (
              <span className="text-white text-[9px] font-bold">
                {token.symbol[0]}
              </span>
            )}
          </div>
          <span className="text-white/70 text-xs font-semibold">
            {token.symbol}
          </span>
        </div>
      </div>

      <input
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
          )
        }
        disabled={disabled}
        className="w-full bg-transparent text-white text-2xl font-semibold outline-none placeholder:text-white/15 disabled:cursor-not-allowed"
      />

      <div className="flex items-center justify-between mt-2">
        <span className="text-white/30 text-xs">${usdValue ?? "0"}</span>
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs tabular-nums">
            {balanceValue} {token.symbol}
          </span>
          {onMax && (
            <button
              type="button"
              onClick={onMax}
              disabled={disabled}
              className="text-[#229EDF] text-xs font-semibold hover:text-[#1a8bc7] transition-colors disabled:opacity-40 uppercase tracking-wide"
            >
              {balanceLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueEl,
  dimmed,
}: {
  label: string;
  value?: string;
  valueEl?: React.ReactNode;
  dimmed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-white/40 text-xs">{label}</span>
      {valueEl ?? (
        <span
          className={`text-xs font-medium tabular-nums ${dimmed ? "text-white/40" : "text-white/80"}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export function PoolDetailPanel({
  pool,
  type: initialType,
  isWalletConnected = false,
  supportsBorrow = true,
  depositWithdrawMode = false,
  ammTab = "deposit",
  onAmmTabChange,
  ammAmount = "",
  onAmmAmountChange,
  onAmmSubmit,
  isAmmSubmitting = false,
  ammSubmitDisabled = true,
  ammInsufficientFundsMessage,
  canLend = false,
  canBorrow = false,
  onLendSubmit,
  onBorrowSubmit,
  isLendingActionPending = false,
}: PoolDetailPanelProps) {
  const [mode, setMode] = useState<"lend" | "borrow">(initialType);
  const [collateralAmount, setCollateralAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");

  const { price: token1Price } = useTokenPrice(pool.token1.symbol);
  const { price: token2Price } = useTokenPrice(pool.token2.symbol);

  const ammUsdValue = useMemo(() => {
    const parsed = parseFloat(ammAmount);
    if (!parsed || !token1Price) return "0.00";
    return (parsed * token1Price).toFixed(2);
  }, [ammAmount, token1Price]);

  const collateralUsdValue = useMemo(() => {
    const parsed = parseFloat(collateralAmount);
    if (!parsed || !token1Price) return "0.00";
    return (parsed * token1Price).toFixed(2);
  }, [collateralAmount, token1Price]);

  const borrowUsdValue = useMemo(() => {
    const parsed = parseFloat(borrowAmount);
    if (!parsed || !token2Price) return "0.00";
    return (parsed * token2Price).toFixed(2);
  }, [borrowAmount, token2Price]);

  const lendingTabs = supportsBorrow
    ? (["lend", "borrow"] as const)
    : (["lend"] as const);

  const isDepositTab = ammTab === "deposit";
  const balanceForAmm = isDepositTab
    ? (pool.token1Balance ?? "0.00")
    : (pool.lpBalance ?? "0.00");
  const maxAmm = () => {
    if (isDepositTab) onAmmAmountChange?.(pool.token1Balance ?? "0");
    else onAmmAmountChange?.(pool.lpBalance ?? "0");
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {depositWithdrawMode && (
        <div className="flex bg-[#2A2A2A] rounded-xl p-1 gap-1">
          {(["deposit", "withdraw"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onAmmTabChange?.(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                ammTab === t
                  ? "bg-[#229EDF] text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {!depositWithdrawMode && supportsBorrow && (
        <div className="flex bg-[#2A2A2A] rounded-xl p-1 gap-1">
          {lendingTabs.map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                mode === m
                  ? "bg-[#229EDF] text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {m === "lend" ? "Lend" : "Borrow"}
            </button>
          ))}
        </div>
      )}

      {depositWithdrawMode && ammInsufficientFundsMessage && (
        <p className="text-sm text-red-400/90 font-medium px-0.5" role="alert">
          {ammInsufficientFundsMessage}
        </p>
      )}

      {depositWithdrawMode ? (
        <AmountInput
          label={
            isDepositTab
              ? `Supply ${pool.token1.symbol}`
              : `Withdraw ${pool.token1.symbol}`
          }
          token={pool.token1}
          value={ammAmount}
          onChange={(v) => onAmmAmountChange?.(v)}
          balanceLabel="MAX"
          balanceValue={balanceForAmm}
          onMax={maxAmm}
          disabled={!isWalletConnected}
          usdValue={ammUsdValue}
        />
      ) : (
        <>
          {mode === "lend" && (
            <AmountInput
              label={`Supply ${pool.token1.symbol}`}
              token={pool.token1}
              value={collateralAmount}
              onChange={setCollateralAmount}
              balanceLabel="MAX"
              balanceValue={pool.token1Balance ?? "0.00"}
              onMax={() => setCollateralAmount(pool.token1Balance ?? "0")}
              disabled={!isWalletConnected}
              usdValue={collateralUsdValue}
            />
          )}
          {mode === "borrow" && (
            <AmountInput
              label={`Borrow ${pool.token2.symbol}`}
              token={pool.token2}
              value={borrowAmount}
              onChange={setBorrowAmount}
              balanceLabel="MAX"
              balanceValue={pool.borrowLimit ?? "0.00"}
              onMax={() => setBorrowAmount(pool.borrowLimit ?? "0")}
              disabled={!isWalletConnected}
              usdValue={borrowUsdValue}
            />
          )}
        </>
      )}

      <div className="rounded-xl bg-[#1C1C1C] border border-white/5 px-4 py-1">
        <InfoRow
          label="Network"
          valueEl={
            <div className="flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-[#229EDF]" />
              <span className="text-white/80 text-xs font-medium">
                {pool.network}
              </span>
            </div>
          }
        />
        <InfoRow
          label={`Collateral (${pool.token1.symbol})`}
          valueEl={
            <div className="text-right">
              <span className="text-xs font-medium tabular-nums text-white/80">
                {pool.collateralBalance ?? "0.00"}
              </span>
              <span className="block text-[10px] tabular-nums text-white/35">
                $
                {(
                  parseFloat(pool.collateralBalance ?? "0") * token1Price
                ).toFixed(2)}
              </span>
            </div>
          }
        />
        <InfoRow
          label={`Loan (${pool.token2.symbol})`}
          valueEl={
            <div className="text-right">
              <span className="text-xs font-medium tabular-nums text-white/80">
                {pool.loanBalance ?? "0.00"}
              </span>
              <span className="block text-[10px] tabular-nums text-white/35">
                $
                {(parseFloat(pool.loanBalance ?? "0") * token2Price).toFixed(2)}
              </span>
            </div>
          }
        />
        <InfoRow
          label="LTV"
          value={`${pool.currentLtv ?? 0}%`}
          dimmed={(pool.currentLtv ?? 0) === 0}
        />
        {pool.liquidationLtv > 0 && (
          <InfoRow label="Liquidation LTV" value={`${pool.liquidationLtv}%`} />
        )}
        <InfoRow
          label="Supply APY"
          valueEl={
            <span className="text-xs font-medium tabular-nums text-white/80 text-right max-w-[min(12rem,55vw)]">
              {pool.supplyApy}
            </span>
          }
        />
        {pool.borrowApyLabel != null && (
          <InfoRow label="Borrow" value={pool.borrowApyLabel} />
        )}
      </div>

      {depositWithdrawMode && onAmmSubmit && (
        <div className="pt-1">
          {!isWalletConnected && (
            <p className="text-white/35 text-xs text-center mb-2">
              Connect your wallet to sign transactions
            </p>
          )}
          <button
            type="button"
            onClick={() => void onAmmSubmit()}
            disabled={ammSubmitDisabled}
            className="w-full py-3.5 rounded-xl bg-[#229EDF] text-white font-semibold text-sm hover:bg-[#1a8bc7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isAmmSubmitting ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing…
              </span>
            ) : isDepositTab ? (
              "Deposit"
            ) : (
              "Withdraw"
            )}
          </button>
        </div>
      )}

      {!depositWithdrawMode && supportsBorrow && (canLend || canBorrow) && (
        <div className="pt-1">
          {!isWalletConnected && (
            <p className="text-white/35 text-xs text-center mb-2">
              Connect your wallet to sign transactions
            </p>
          )}
          {mode === "lend" && canLend && onLendSubmit && (
            <button
              type="button"
              onClick={() => void onLendSubmit(collateralAmount)}
              disabled={
                isLendingActionPending ||
                !isWalletConnected ||
                !collateralAmount ||
                parseFloat(collateralAmount) <= 0
              }
              className="w-full py-3.5 rounded-xl bg-[#229EDF] text-white font-semibold text-sm hover:bg-[#1a8bc7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLendingActionPending ? "Processing…" : "Lend"}
            </button>
          )}
          {mode === "borrow" && canBorrow && onBorrowSubmit && (
            <button
              type="button"
              onClick={() => void onBorrowSubmit(borrowAmount)}
              disabled={
                isLendingActionPending ||
                !isWalletConnected ||
                !borrowAmount ||
                parseFloat(borrowAmount) <= 0
              }
              className="w-full py-3.5 rounded-xl bg-[#229EDF] text-white font-semibold text-sm hover:bg-[#1a8bc7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLendingActionPending ? "Processing…" : "Borrow"}
            </button>
          )}
        </div>
      )}

      {!depositWithdrawMode && !supportsBorrow && canLend && onLendSubmit && (
        <div className="pt-1">
          {!isWalletConnected && (
            <p className="text-white/35 text-xs text-center mb-2">
              Connect your wallet to sign transactions
            </p>
          )}
          <button
            type="button"
            onClick={() => void onLendSubmit(collateralAmount)}
            disabled={
              isLendingActionPending ||
              !isWalletConnected ||
              !collateralAmount ||
              parseFloat(collateralAmount) <= 0
            }
            className="w-full py-3.5 rounded-xl bg-[#229EDF] text-white font-semibold text-sm hover:bg-[#1a8bc7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLendingActionPending ? "Processing…" : "Lend"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Full layout (left info + right panel) ──────────────────────────────────────

interface PoolDetailLayoutProps {
  pool: PoolDetailPanelPool;
  type: "lend" | "borrow";
  isWalletConnected?: boolean;
  supportsBorrow?: boolean;
  depositWithdrawMode?: boolean;
  ammTab?: "deposit" | "withdraw";
  onAmmTabChange?: (t: "deposit" | "withdraw") => void;
  ammAmount?: string;
  onAmmAmountChange?: (v: string) => void;
  onAmmSubmit?: () => void | Promise<void>;
  isAmmSubmitting?: boolean;
  ammSubmitDisabled?: boolean;
  ammInsufficientFundsMessage?: string | null;
  canLend?: boolean;
  canBorrow?: boolean;
  onLendSubmit?: (supplyAmount: string) => void | Promise<void>;
  onBorrowSubmit?: (borrowAmount: string) => void | Promise<void>;
  isLendingActionPending?: boolean;
}

export function PoolDetailLayout({
  pool,
  type,
  isWalletConnected,
  supportsBorrow,
  depositWithdrawMode,
  ammTab,
  onAmmTabChange,
  ammAmount,
  onAmmAmountChange,
  onAmmSubmit,
  isAmmSubmitting,
  ammSubmitDisabled,
  ammInsufficientFundsMessage,
  canLend,
  canBorrow,
  onLendSubmit,
  onBorrowSubmit,
  isLendingActionPending,
}: PoolDetailLayoutProps) {
  const resolvedIssuerIcon =
    pool.issuer.icon ??
    getPoolTokenIcon({ type: "contract", code: pool.issuer.name });

  return (
    <div
      className="w-full h-full rounded-2xl border border-white/7 overflow-hidden flex flex-col lg:flex-row"
      style={{ background: "#111111" }}
    >
      {/* ── Left: scrollable info ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 min-h-0 overflow-y-auto p-8 lg:border-r border-white/7">
        {/* Header */}
        <div className="flex items-center gap-5 mb-10">
          <OverlappingTokens
            token1={pool.token1}
            token2={pool.token2}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-white font-bold text-3xl sm:text-4xl leading-none">
                {pool.name || `${pool.token1.symbol} / ${pool.token2.symbol}`}
              </h1>
              {pool.liquidationLtv > 0 && (
                <span className="bg-white/8 text-white/60 text-sm font-semibold px-3 py-1 rounded-lg border border-white/10">
                  {pool.liquidationLtv}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2.5 flex-wrap">
              <CopyAddress address={pool.contractAddress} />
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#229EDF]" />
                <span className="text-white/50 text-sm">{pool.network}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 mb-8" />

        {/* Metrics grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-7">
          <div>
            <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
              Total Liquidity
            </p>
            <p className="text-white text-3xl font-bold tabular-nums leading-none">
              {pool.totalLiquidity}
            </p>
            {pool.totalLiquidityRaw && (
              <p className="text-white/30 text-xs mt-2 tabular-nums">
                {pool.totalLiquidityRaw}
              </p>
            )}
          </div>

          <div>
            <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
              Supply APY
            </p>
            <p className="text-white text-3xl font-bold tabular-nums leading-none">
              {pool.supplyApy}
            </p>
            {pool.supplyApySub && (
              <p className="text-white/30 text-xs mt-2 tabular-nums">
                {pool.supplyApySub}
              </p>
            )}
          </div>

          <div>
            <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
              Issuer
            </p>
            <div className="flex items-center gap-2">
              {resolvedIssuerIcon && (
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0">
                  <Image
                    src={resolvedIssuerIcon}
                    alt={pool.issuer.name}
                    width={32}
                    height={32}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <span className="text-white text-lg font-bold truncate">
                {pool.issuer.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: panel (NO scroll) ──────────────────────────────────────── */}
      <div className="w-full lg:w-96 shrink-0 h-full flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden p-6">
          <PoolDetailPanel
            pool={pool}
            type={type}
            isWalletConnected={isWalletConnected}
            supportsBorrow={supportsBorrow}
            depositWithdrawMode={depositWithdrawMode}
            ammTab={ammTab}
            onAmmTabChange={onAmmTabChange}
            ammAmount={ammAmount}
            onAmmAmountChange={onAmmAmountChange}
            onAmmSubmit={onAmmSubmit}
            isAmmSubmitting={isAmmSubmitting}
            ammSubmitDisabled={ammSubmitDisabled}
            ammInsufficientFundsMessage={ammInsufficientFundsMessage}
            canLend={canLend}
            canBorrow={canBorrow}
            onLendSubmit={onLendSubmit}
            onBorrowSubmit={onBorrowSubmit}
            isLendingActionPending={isLendingActionPending}
          />
        </div>
      </div>
    </div>
  );
}
