"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { Copy, Check, Globe, Info } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getPoolTokenIcon } from "../../utils/poolTokenIcons";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useFxRate } from "@/hooks/useFxRate";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { useCurrencyStore } from "@/stores/currency.store";
import { usePoolRateHistory } from "../../hooks/usePoolRateHistory";
import { usePoolActivity } from "../../hooks/usePoolActivity";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PoolDetailPanelToken {
  symbol: string;
  icon?: string | null;
  address?: string;
}

export interface CollateralOption {
  symbol: string;
  address: string;
  poolId: string;
  decimals: number;
  cFactor: number;
  userBalance: string;
  walletBalance?: string;
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
  /** Total borrowed (USD formatted) — shown for Blend pools */
  totalBorrowed?: string;
  /** Total borrowed in token units — shown below USD value */
  totalBorrowedRaw?: string;
  /** Formatted total supply / LP yield (e.g. AMM APY) */
  supplyApy: string;
  /** Optional subline, e.g. base + rewards breakdown for Aqua */
  supplyApySub?: string;
  /** Lending pool borrow APY (e.g. Blend); shown when present */
  borrowApyLabel?: string;
  /** AMM pool type label (Aqua pools), e.g. "Constant Product" */
  poolType?: string;
  /** Optional detail shown below pool type, e.g. "A: 20" for stable swap */
  poolTypeDetail?: string;
  /** Oracle / market price string, e.g. "USDC = $1.00" */
  oraclePrice?: string;
  /** Pool utilization rate, e.g. "89.27%" */
  utilization?: string;
  issuer: { name: string; icon?: string | null };
  collateralBalance?: string;
  loanBalance?: string;
  currentLtv?: number;
  token1Balance?: string;
  token2Balance?: string;
  /** LP / pool shares (max for withdraw) */
  lpBalance?: string;
  borrowLimit?: string;
  /** Blend liability factor for this reserve's borrow asset (used for HF validation) */
  lFactor?: number;
  /** Available assets that can be used as collateral when borrowing (Blend only) */
  collateralOptions?: CollateralOption[];
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
  ammAmount2?: string;
  ammMaxAmount?: string;
  onAmmAmountChange?: (v: string) => void;
  onAmmSubmit?: () => void | Promise<void>;
  isAmmSubmitting?: boolean;
  ammSubmitDisabled?: boolean;
  ammInsufficientFundsMessage?: string | null;
  canLend?: boolean;
  canBorrow?: boolean;
  onLendSubmit?: (supplyAmount: string) => void | Promise<void>;
  onBorrowSubmit?: (
    borrowAmount: string,
    collateralAssetAddress: string,
    collateralAmount: string
  ) => void | Promise<void>;
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

  // Single-asset pools (Blend): token2 falls back to token1 — show only one icon
  const isSingle =
    token1.symbol === token2.symbol ||
    (token1.address && token1.address === token2.address);

  const renderIcon = (token: PoolDetailPanelToken, fallbackClass: string) => {
    const icon =
      token.icon ?? getPoolTokenIcon({ type: "contract", code: token.symbol });
    return icon ? (
      <Image
        src={icon}
        alt={token.symbol}
        width={px}
        height={px}
        unoptimized
        className={getTokenIconFitClass(token.symbol)}
      />
    ) : (
      <span
        className={`${fallbackClass} font-bold`}
        style={{ fontSize: px / 3 }}
      >
        {token.symbol[0]}
      </span>
    );
  };

  if (isSingle) {
    return (
      <div
        className={`shrink-0 flex items-center`}
        style={{ width: px, height: px }}
      >
        <div
          className={`${circle} rounded-full bg-white/10 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-md`}
        >
          {renderIcon(token1, "text-white")}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${wrap} shrink-0 flex items-center`}>
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 ${circle} rounded-full bg-white/10 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-md z-1`}
      >
        {renderIcon(token1, "text-white")}
      </div>
      <div
        className={`absolute ${offset} top-1/2 -translate-y-1/2 ${circle} rounded-full bg-white/10 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-md z-2`}
      >
        {renderIcon(token2, "text-white")}
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

function trimBalance(value: string): string {
  const n = parseFloat(value);
  if (isNaN(n)) return value;
  if (n === 0) return "0";
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function AmountInput({
  label,
  token,
  token2,
  value,
  onChange,
  balanceLabel,
  balanceValue,
  balanceValue2,
  onMax,
  disabled,
  readOnly,
  usdValue,
}: {
  label: string;
  token: PoolDetailPanelToken;
  token2?: PoolDetailPanelToken;
  value: string;
  onChange: (v: string) => void;
  balanceLabel: string;
  balanceValue: string;
  balanceValue2?: string;
  onMax?: () => void;
  disabled?: boolean;
  readOnly?: boolean;
  usdValue?: string;
}) {
  const resolvedIcon =
    token.icon ?? getPoolTokenIcon({ type: "contract", code: token.symbol });
  const resolvedIcon2 = token2
    ? (token2.icon ??
      getPoolTokenIcon({ type: "contract", code: token2.symbol }))
    : null;

  const renderTokenIcon = (
    t: PoolDetailPanelToken,
    icon: string | null | undefined
  ) => (
    <div className="w-5 h-5 rounded-full bg-[#2A2A2A] flex items-center justify-center overflow-hidden shrink-0">
      {icon ? (
        <Image
          src={icon}
          alt={t.symbol}
          width={20}
          height={20}
          unoptimized
          className={getTokenIconFitClass(t.symbol)}
        />
      ) : (
        <span className="text-white text-[9px] font-bold">{t.symbol[0]}</span>
      )}
    </div>
  );

  return (
    <div
      className="rounded-xl border border-white/10 bg-[#1C1C1C] p-4 focus-within:border-[#229EDF]/40 transition-colors"
      style={{ borderWidth: 1 }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/50 text-xs font-medium">{label}</p>
        <div className="flex items-center gap-1.5">
          {token2 ? (
            <div className="relative flex items-center w-8 h-5 shrink-0">
              <div className="absolute left-0">
                {renderTokenIcon(token, resolvedIcon)}
              </div>
              <div className="absolute left-3.5">
                {renderTokenIcon(token2, resolvedIcon2)}
              </div>
            </div>
          ) : (
            renderTokenIcon(token, resolvedIcon)
          )}
          <span className="text-white/70 text-xs font-semibold">
            {token2 ? `${token.symbol}/${token2.symbol}` : token.symbol}
          </span>
        </div>
      </div>

      <input
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        onChange={(e) =>
          readOnly
            ? undefined
            : onChange(
                e.target.value
                  .replace(/[^0-9.]/g, "")
                  .replace(/(\..*)\./g, "$1")
              )
        }
        disabled={disabled}
        readOnly={readOnly}
        className="w-full bg-transparent text-white text-2xl font-semibold outline-none placeholder:text-white/15 disabled:cursor-not-allowed read-only:cursor-default"
      />

      <div className="flex items-center justify-between mt-2">
        <span className="text-white/30 text-xs">{usdValue ?? "0"}</span>
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs tabular-nums">
            {token2 && balanceValue2 != null ? (
              <>
                <span>
                  {trimBalance(balanceValue)} {token.symbol}
                </span>
                <span className="text-white/20"> / </span>
                <span>
                  {trimBalance(balanceValue2)} {token2.symbol}
                </span>
              </>
            ) : (
              `${trimBalance(balanceValue)} ${token.symbol}`
            )}
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

function TokenIcon({
  symbol,
  icon,
  size = 14,
}: {
  symbol: string;
  icon?: string | null;
  size?: number;
}) {
  const resolvedIcon =
    icon ?? getPoolTokenIcon({ type: "contract", code: symbol });
  return (
    <div
      className="rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden shrink-0"
      style={{ width: size, height: size }}
    >
      {resolvedIcon ? (
        <Image
          src={resolvedIcon}
          alt={symbol}
          width={size}
          height={size}
          unoptimized
          className={getTokenIconFitClass(symbol)}
        />
      ) : (
        <span
          style={{ fontSize: size * 0.5 }}
          className="font-bold text-white leading-none"
        >
          {symbol[0]}
        </span>
      )}
    </div>
  );
}

function InfoRow({
  label,
  labelEl,
  value,
  valueEl,
  dimmed,
}: {
  label?: string;
  labelEl?: React.ReactNode;
  value?: string;
  valueEl?: React.ReactNode;
  dimmed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      {labelEl ?? <span className="text-white/40 text-xs">{label}</span>}
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
  ammAmount2,
  ammMaxAmount,
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

  const isPair =
    pool.token2.symbol &&
    pool.token2.symbol !== pool.token1.symbol &&
    pool.token2.symbol !== "Lending" &&
    pool.token2.symbol !== "?";
  const pairLabel = isPair
    ? `${pool.token1.symbol}/${pool.token2.symbol}`
    : pool.token1.symbol;

  // Borrow collateral selection (Blend)
  const defaultCollateral = pool.collateralOptions?.[0];
  const [selectedCollateralAddress, setSelectedCollateralAddress] = useState(
    defaultCollateral?.address ?? ""
  );
  const [collateralInputAmount, setCollateralInputAmount] = useState("");

  const selectedCollateral = useMemo(
    () =>
      pool.collateralOptions?.find(
        (o) => o.address === selectedCollateralAddress
      ) ?? pool.collateralOptions?.[0],
    [pool.collateralOptions, selectedCollateralAddress]
  );

  const { price: token1Price } = useTokenPrice(pool.token1.symbol);
  const { price: token2Price } = useTokenPrice(pool.token2.symbol);
  const { price: selectedCollateralPrice } = useTokenPrice(
    selectedCollateral?.symbol
  );
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });
  const formatUsdValue = (amountUsd: number) =>
    formatCurrency(convertUsdToSelected(amountUsd, fxRate), selectedCurrency);

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

  const BLEND_MIN_COLLATERAL_USD = 5;

  const collateralInputUsd = useMemo(() => {
    const parsed = parseFloat(collateralInputAmount);
    if (!parsed || !selectedCollateralPrice) return 0;
    return parsed * selectedCollateralPrice;
  }, [collateralInputAmount, selectedCollateralPrice]);

  const collateralBelowMinimum =
    !!pool.collateralOptions?.length &&
    mode === "borrow" &&
    collateralInputAmount !== "" &&
    collateralInputUsd < BLEND_MIN_COLLATERAL_USD;

  // Max borrow in borrow-asset units derived from the NEW collateral being supplied.
  // Formula: (collateral_usd × cFactor) / (borrow_price × lFactor)
  const dynamicBorrowMax = useMemo(() => {
    if (
      !pool.collateralOptions?.length ||
      !selectedCollateral ||
      !collateralInputAmount
    )
      return null;
    const collateralUsd = collateralInputUsd;
    const cFactor = selectedCollateral.cFactor ?? 0; // decimal, e.g. 0.95
    const lFactor = pool.lFactor ?? 1; // decimal, e.g. 1.05
    const borrowPrice = token2Price ?? 0;
    if (collateralUsd <= 0 || borrowPrice <= 0) return null;
    return (collateralUsd * cFactor) / (borrowPrice * lFactor);
  }, [
    collateralInputUsd,
    selectedCollateral,
    collateralInputAmount,
    token2Price,
    pool.lFactor,
    pool.collateralOptions,
  ]);

  const borrowExceedsHf =
    dynamicBorrowMax !== null &&
    !!borrowAmount &&
    parseFloat(borrowAmount) > dynamicBorrowMax + 1e-7;

  const lendingTabs = supportsBorrow
    ? (["lend", "borrow"] as const)
    : (["lend"] as const);

  const isDepositTab = ammTab === "deposit";
  const balanceForAmm = isDepositTab
    ? (pool.token1Balance ?? "0.00")
    : (pool.lpBalance ?? "0.00");
  const maxAmm = () => {
    if (isDepositTab)
      onAmmAmountChange?.(ammMaxAmount ?? pool.token1Balance ?? "0");
    else onAmmAmountChange?.(pool.lpBalance ?? "0");
  };

  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">
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

        {!depositWithdrawMode && !supportsBorrow && (
          <span className="inline-flex w-fit items-center px-3 py-1.5 rounded-lg bg-[#2A2A2A] text-xs font-semibold text-white">
            Lending
          </span>
        )}

        {depositWithdrawMode && ammInsufficientFundsMessage && (
          <p
            className="text-sm text-red-400/90 font-medium px-0.5"
            role="alert"
          >
            {ammInsufficientFundsMessage}
          </p>
        )}

        {depositWithdrawMode ? (
          <>
            <AmountInput
              label={isDepositTab ? "Supply" : "Withdraw"}
              token={pool.token1}
              value={ammAmount}
              onChange={(v) => onAmmAmountChange?.(v)}
              balanceLabel="MAX"
              balanceValue={balanceForAmm}
              onMax={maxAmm}
              disabled={!isWalletConnected}
              usdValue={formatUsdValue(Number.parseFloat(ammUsdValue) || 0)}
            />
            {isPair && isDepositTab && (
              <AmountInput
                label="Supply"
                token={pool.token2}
                value={ammAmount2 ?? ""}
                onChange={() => {}}
                balanceLabel=""
                balanceValue={pool.token2Balance ?? "0.00"}
                readOnly
                disabled={!isWalletConnected}
              />
            )}
          </>
        ) : (
          <>
            {mode === "lend" && (
              <AmountInput
                label="Supply"
                token={pool.token1}
                token2={isPair ? pool.token2 : undefined}
                value={collateralAmount}
                onChange={setCollateralAmount}
                balanceLabel="MAX"
                balanceValue={pool.token1Balance ?? "0.00"}
                balanceValue2={
                  isPair ? (pool.token2Balance ?? "0.00") : undefined
                }
                onMax={() => setCollateralAmount(pool.token1Balance ?? "0")}
                disabled={!isWalletConnected}
                usdValue={formatUsdValue(
                  Number.parseFloat(collateralUsdValue) || 0
                )}
              />
            )}
            {mode === "borrow" && (
              <>
                <AmountInput
                  label={`Borrow ${pool.token2.symbol}`}
                  token={pool.token2}
                  value={borrowAmount}
                  onChange={setBorrowAmount}
                  balanceLabel="MAX"
                  balanceValue={
                    dynamicBorrowMax != null
                      ? dynamicBorrowMax.toFixed(4)
                      : (pool.borrowLimit ?? "0.00")
                  }
                  onMax={() =>
                    setBorrowAmount(
                      dynamicBorrowMax != null
                        ? dynamicBorrowMax.toFixed(7)
                        : (pool.borrowLimit ?? "0")
                    )
                  }
                  disabled={!isWalletConnected}
                  usdValue={formatUsdValue(
                    Number.parseFloat(borrowUsdValue) || 0
                  )}
                />
                {borrowExceedsHf && (
                  <p className="text-xs text-red-400/90 px-0.5">
                    Borrow amount exceeds your collateral limit (~
                    {dynamicBorrowMax!.toFixed(4)} {pool.token2.symbol} max)
                  </p>
                )}

                {/* Collateral card — shown for Blend pools */}
                {pool.collateralOptions &&
                  pool.collateralOptions.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-[#1C1C1C] p-4 flex flex-col gap-3">
                      <p className="text-white/50 text-xs font-medium">
                        Collateral
                      </p>

                      {/* Asset selector */}
                      <div className="flex flex-wrap gap-3">
                        {pool.collateralOptions.map((opt) => {
                          const icon = getPoolTokenIcon({
                            type: "contract",
                            code: opt.symbol,
                          });
                          const isSelected =
                            selectedCollateralAddress === opt.address;
                          return (
                            <button
                              key={opt.address}
                              type="button"
                              onClick={() => {
                                setSelectedCollateralAddress(opt.address);
                                setCollateralInputAmount("");
                              }}
                              className="flex flex-col items-center gap-1 transition-colors"
                            >
                              <div
                                className={`w-9 h-9 shrink-0 rounded-full border-2 overflow-hidden flex items-center justify-center bg-white/5 transition-colors ${
                                  isSelected
                                    ? "border-[#229EDF]"
                                    : "border-white/10 hover:border-white/30"
                                }`}
                              >
                                {icon ? (
                                  <Image
                                    src={icon}
                                    alt={opt.symbol}
                                    width={36}
                                    height={36}
                                    unoptimized
                                    className={`w-full h-full ${getTokenIconFitClass(opt.symbol)}`}
                                  />
                                ) : (
                                  <span className="text-[10px] font-bold text-white">
                                    {opt.symbol.slice(0, 3)}
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-[10px] font-semibold leading-none ${
                                  isSelected
                                    ? "text-[#229EDF]"
                                    : "text-white/40"
                                }`}
                              >
                                {opt.symbol}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Amount input */}
                      {selectedCollateral && (
                        <>
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={collateralInputAmount}
                              onChange={(e) =>
                                setCollateralInputAmount(
                                  e.target.value
                                    .replace(/[^0-9.]/g, "")
                                    .replace(/(\..*)\./g, "$1")
                                )
                              }
                              disabled={!isWalletConnected}
                              className="w-full bg-transparent text-white text-xl font-semibold outline-none placeholder:text-white/15 disabled:cursor-not-allowed"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setCollateralInputAmount(
                                  selectedCollateral.walletBalance ??
                                    selectedCollateral.userBalance
                                )
                              }
                              disabled={!isWalletConnected}
                              className="ml-3 shrink-0 text-[#229EDF] text-xs font-semibold uppercase tracking-wide hover:text-[#1a8bc7] transition-colors disabled:opacity-40"
                            >
                              MAX
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/30">
                              {formatUsdValue(collateralInputUsd)}
                            </span>
                            <span className="text-white/30 tabular-nums">
                              {selectedCollateral.walletBalance ??
                                selectedCollateral.userBalance}{" "}
                              {selectedCollateral.symbol}
                            </span>
                          </div>

                          {collateralBelowMinimum && (
                            <p className="text-xs text-amber-400/80">
                              Minimum collateral value:{" "}
                              {formatUsdValue(BLEND_MIN_COLLATERAL_USD)}
                            </p>
                          )}
                          {selectedCollateral.walletBalance !== undefined &&
                            collateralInputAmount !== "" &&
                            parseFloat(collateralInputAmount) >
                              parseFloat(selectedCollateral.walletBalance) && (
                              <p className="text-xs text-red-400/90">
                                Insufficient {selectedCollateral.symbol} balance
                              </p>
                            )}
                        </>
                      )}
                    </div>
                  )}
              </>
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
          {mode === "lend" && (
            <InfoRow
              labelEl={
                <div className="flex items-center gap-1.5">
                  {isPair ? (
                    <div className="relative flex items-center w-8 h-5 shrink-0">
                      <div className="absolute left-0">
                        <TokenIcon
                          symbol={pool.token1.symbol}
                          icon={pool.token1.icon}
                          size={20}
                        />
                      </div>
                      <div className="absolute left-3.5">
                        <TokenIcon
                          symbol={pool.token2.symbol}
                          icon={pool.token2.icon}
                          size={20}
                        />
                      </div>
                    </div>
                  ) : (
                    <TokenIcon
                      symbol={pool.token1.symbol}
                      icon={pool.token1.icon}
                      size={20}
                    />
                  )}
                  <span className="text-white/40 text-xs">{`Supplied (${pairLabel})`}</span>
                </div>
              }
              valueEl={
                <div className="text-right">
                  <span className="text-xs font-medium tabular-nums text-white/80">
                    {collateralAmount || "0.00"}
                  </span>
                  <span className="block text-[10px] tabular-nums text-white/35">
                    {formatUsdValue(Number.parseFloat(collateralUsdValue) || 0)}
                  </span>
                </div>
              }
            />
          )}
          {mode === "borrow" && selectedCollateral && (
            <InfoRow
              labelEl={
                <div className="flex items-center gap-1.5">
                  <TokenIcon symbol={selectedCollateral.symbol} size={20} />
                  <span className="text-white/40 text-xs">{`Collateral (${selectedCollateral.symbol})`}</span>
                </div>
              }
              valueEl={
                <div className="text-right">
                  <span className="text-xs font-medium tabular-nums text-white/80">
                    {collateralInputAmount || "0.00"}
                  </span>
                  <span className="block text-[10px] tabular-nums text-white/35">
                    {formatUsdValue(collateralInputUsd)}
                  </span>
                </div>
              }
            />
          )}
          {mode === "borrow" && (
            <InfoRow
              labelEl={
                <div className="flex items-center gap-1.5">
                  <TokenIcon
                    symbol={pool.token2.symbol}
                    icon={pool.token2.icon}
                    size={20}
                  />
                  <span className="text-white/40 text-xs">{`Loan (${pool.token2.symbol})`}</span>
                </div>
              }
              valueEl={
                <div className="text-right">
                  <span className="text-xs font-medium tabular-nums text-white/80">
                    {borrowAmount || "0.00"}
                  </span>
                  <span className="block text-[10px] tabular-nums text-white/35">
                    {formatUsdValue(Number.parseFloat(borrowUsdValue) || 0)}
                  </span>
                </div>
              }
            />
          )}
          {pool.liquidationLtv > 0 && (
            <InfoRow
              label="Liquidation LTV"
              value={`${pool.liquidationLtv}%`}
            />
          )}
          {mode !== "borrow" && (
            <InfoRow
              label="Supply APY"
              valueEl={
                <span className="text-xs font-medium tabular-nums text-white/80 text-right max-w-[min(12rem,55vw)]">
                  {pool.supplyApy}
                </span>
              }
            />
          )}
          {mode === "borrow" && pool.borrowApyLabel != null && (
            <InfoRow label="Borrow APY" value={pool.borrowApyLabel} />
          )}
        </div>

        {depositWithdrawMode && onAmmSubmit && (
          <div className="sticky bottom-0 pt-3 bg-[#121212]">
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
          <div className="sticky bottom-0 pt-3 bg-[#121212]">
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
                onClick={() =>
                  void onBorrowSubmit(
                    borrowAmount,
                    selectedCollateral?.address ?? "",
                    collateralInputAmount
                  )
                }
                disabled={
                  isLendingActionPending ||
                  !isWalletConnected ||
                  !borrowAmount ||
                  parseFloat(borrowAmount) <= 0 ||
                  collateralBelowMinimum ||
                  (!!pool.collateralOptions?.length &&
                    (!collateralInputAmount ||
                      parseFloat(collateralInputAmount) <= 0)) ||
                  (!!selectedCollateral?.walletBalance &&
                    !!collateralInputAmount &&
                    parseFloat(collateralInputAmount) >
                      parseFloat(selectedCollateral.walletBalance)) ||
                  borrowExceedsHf
                }
                className="w-full py-3.5 rounded-xl bg-[#229EDF] text-white font-semibold text-sm hover:bg-[#1a8bc7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLendingActionPending ? "Processing…" : "Borrow"}
              </button>
            )}
          </div>
        )}

        {!depositWithdrawMode && !supportsBorrow && canLend && onLendSubmit && (
          <div className="sticky bottom-0 pt-3 bg-[#121212]">
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
      {/* end scrollable content */}
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
  ammAmount2?: string;
  ammMaxAmount?: string;
  onAmmAmountChange?: (v: string) => void;
  onAmmSubmit?: () => void | Promise<void>;
  isAmmSubmitting?: boolean;
  ammSubmitDisabled?: boolean;
  ammInsufficientFundsMessage?: string | null;
  canLend?: boolean;
  canBorrow?: boolean;
  onLendSubmit?: (supplyAmount: string) => void | Promise<void>;
  onBorrowSubmit?: (
    borrowAmount: string,
    collateralAssetAddress: string,
    collateralAmount: string
  ) => void | Promise<void>;
  isLendingActionPending?: boolean;
}

// ── Activity Feed ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

function formatTs(ts: number): string {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  supply: "text-emerald-400",
  supply_collateral: "text-emerald-400",
  withdraw: "text-orange-400",
  withdraw_collateral: "text-orange-400",
  borrow: "text-purple-400",
  repay: "text-teal-400",
  swap: "text-blue-400",
  deposit: "text-blue-400",
  claim: "text-yellow-400",
};

function formatEventType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function ActivityFeed({ poolId }: { poolId: string }) {
  const { data: events, isLoading, isError } = usePoolActivity(poolId);
  const [page, setPage] = useState(1);

  const total = events?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageEvents =
    events?.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE) ?? [];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/7 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1.4fr_0.8fr_1fr_2rem] gap-4 px-5 py-3 border-b border-white/7">
          {["Date", "Type", "User"].map((h) => (
            <span
              key={h}
              className="text-white/30 text-xs font-medium uppercase tracking-wider"
            >
              {h}
            </span>
          ))}
          <span />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-12 mx-4 my-2 rounded-lg bg-white/5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-white/30 text-sm text-center py-12">
        Could not load activity
      </p>
    );
  }

  if (!events || events.length === 0) {
    return (
      <p className="text-white/30 text-sm text-center py-12">
        No recent activity
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-white/7 overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[1.4fr_0.8fr_1fr_2rem] gap-4 px-5 py-3 border-b border-white/7 bg-white/[0.02]">
        <span className="text-white/30 text-xs font-medium uppercase tracking-wider">
          Date
        </span>
        <span className="text-white/30 text-xs font-medium uppercase tracking-wider">
          Type
        </span>
        <span className="text-white/30 text-xs font-medium uppercase tracking-wider">
          User
        </span>
        <span />
      </div>

      {/* Rows */}
      {pageEvents.map((event) => {
        const typeColor =
          EVENT_TYPE_COLORS[event.type.toLowerCase()] ?? "text-white/60";
        const userShort = event.user
          ? `${event.user.slice(0, 4)}...${event.user.slice(-4)}`
          : "—";
        const explorerUrl = event.user
          ? `https://stellar.expert/explorer/public/account/${event.user}`
          : null;

        return (
          <div
            key={event.id}
            className="grid grid-cols-[1.4fr_0.8fr_1fr_2rem] gap-4 items-center px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/[0.025] transition-colors"
          >
            {/* Date */}
            <span className="text-white/50 text-xs font-mono tabular-nums">
              {formatTs(event.ts)}
            </span>

            {/* Type */}
            <span className={`text-sm font-medium ${typeColor}`}>
              {event.type}
            </span>

            {/* User */}
            <span className="text-white/50 text-xs font-mono">{userShort}</span>

            {/* Link */}
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/25 hover:text-white/70 transition-colors justify-self-end"
                title="View on Stellar Expert"
              >
                <ExternalLinkIcon />
              </a>
            ) : (
              <span />
            )}
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-4 border-t border-white/7">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/7 text-white/60 hover:bg-white/12 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-white/40 text-xs tabular-nums px-3 py-1.5 rounded-full bg-white/5">
            {safePage} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/7 text-white/60 hover:bg-white/12 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Rates Chart ────────────────────────────────────────────────────────────────

type RatesSeries = "supply" | "borrow";

function generateRateHistory(
  baseRate: number,
  days = 7,
  points = 84
): { date: string; value: number }[] {
  const now = Date.now();
  const step = (days * 24 * 60 * 60 * 1000) / points;
  // Build values forward, then scale so the final point = baseRate exactly
  const raw: number[] = [baseRate * (1 + (Math.random() - 0.5) * 0.3)];
  for (let i = 1; i <= points; i++) {
    // Mean-revert toward baseRate with small noise
    const prev = raw[i - 1];
    const revert = (baseRate - prev) * 0.08;
    const noise = (Math.random() - 0.5) * baseRate * 0.06;
    raw.push(Math.max(0.01, prev + revert + noise));
  }
  // Force the very last point to exactly match the current rate
  raw[raw.length - 1] = baseRate;

  return raw.map((value, i) => {
    const ts = now - (points - i) * step;
    const d = new Date(ts);
    const label = `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
    return { date: label, value: parseFloat(value.toFixed(4)) };
  });
}

function RatesChart({
  poolId,
  supplyApy,
  borrowApy,
}: {
  poolId: string;
  supplyApy: string;
  borrowApy?: string;
}) {
  const supplyRate = parseFloat(supplyApy) || 0;
  const borrowRate = parseFloat(borrowApy ?? "0") || 0;
  const hasBorrow = borrowRate > 0;

  const [series, setSeries] = useState<RatesSeries>(
    hasBorrow ? "borrow" : "supply"
  );

  const { data: history } = usePoolRateHistory(poolId);

  // Fall back to synthetic data when DB has no records yet
  const syntheticSupply = useMemo(
    () => generateRateHistory(supplyRate),
    [supplyApy]
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const syntheticBorrow = useMemo(
    () => generateRateHistory(borrowRate),
    [borrowApy]
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const realSupplyData = useMemo(
    () =>
      history && history.length > 0
        ? history.map((p) => ({ date: p.date, value: p.supply_apy }))
        : null,
    [history]
  );
  const realBorrowData = useMemo(
    () =>
      history && history.length > 0 && history.some((p) => p.borrow_apy != null)
        ? history.map((p) => ({ date: p.date, value: p.borrow_apy ?? 0 }))
        : null,
    [history]
  );

  const supplyData = realSupplyData ?? syntheticSupply;
  const borrowData = realBorrowData ?? syntheticBorrow;
  const isRealData = realSupplyData != null;

  const data = series === "supply" ? supplyData : borrowData;
  const currentRate = series === "supply" ? supplyRate : borrowRate;
  const maxVal = Math.max(...data.map((d) => d.value));
  const yMax = Math.ceil(maxVal * 1.3);

  // Show every ~12th label to avoid crowding
  const tickIndices = new Set(
    data.map((_, i) => i).filter((i) => i % 12 === 0 || i === data.length - 1)
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-white/70 text-sm font-medium">
          Instantaneous Rates
        </h3>
        <Info size={13} className="text-white/30" />
        {isRealData && (
          <span className="ml-1 flex items-center gap-1 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Live
          </span>
        )}
      </div>

      <div
        className="rounded-xl border border-white/7 p-5"
        style={{ background: "#0e0e0e" }}
      >
        <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
          <div>
            <p className="text-white/40 text-xs mb-1">Instantaneous Rate</p>
            <p className="text-white text-4xl font-bold tabular-nums leading-none">
              {currentRate.toFixed(2)}%
            </p>
          </div>
          <div className="flex gap-1.5">
            {hasBorrow && (
              <button
                onClick={() => setSeries("borrow")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  series === "borrow"
                    ? "bg-white/15 text-white"
                    : "bg-white/5 text-white/40 hover:text-white/70"
                }`}
              >
                Borrow
              </button>
            )}
            <button
              onClick={() => setSeries("supply")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                series === "supply"
                  ? "bg-white/15 text-white"
                  : "bg-white/5 text-white/40 hover:text-white/70"
              }`}
            >
              Supply
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="0"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tickFormatter={(v, i) => (tickIndices.has(i) ? v : "")}
            />
            <YAxis
              domain={[0, yMax]}
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              width={36}
            />
            <Tooltip
              contentStyle={{
                background: "#1a1a1a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: 12,
              }}
              formatter={(v: number) => [
                `${v.toFixed(4)}%`,
                series === "supply" ? "Supply" : "Borrow",
              ]}
              labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}
              cursor={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: "#3b82f6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Info Tabs (Overview / Advanced / Activity) ─────────────────────────────

type InfoTab = "overview" | "advanced" | "activity";

function MarketAttributeRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-white/5 last:border-0">
      <span className="text-white/50 text-sm">{label}</span>
      <span className="text-white text-sm font-medium text-right">
        {children}
      </span>
    </div>
  );
}

function TokenLabel({ token }: { token: PoolDetailPanelToken }) {
  const icon =
    token.icon ?? getPoolTokenIcon({ type: "contract", code: token.symbol });
  return (
    <span className="flex items-center gap-1.5">
      {icon && (
        <span className="w-5 h-5 rounded-full overflow-hidden bg-white/5 shrink-0 inline-flex">
          <Image
            src={icon}
            alt={token.symbol}
            width={20}
            height={20}
            unoptimized
            className={`w-full h-full ${getTokenIconFitClass(token.symbol)}`}
          />
        </span>
      )}
      {token.symbol}
    </span>
  );
}

function InfoTabs({ pool }: { pool: PoolDetailPanelPool }) {
  const [activeTab, setActiveTab] = useState<InfoTab>("overview");

  const overviewRef = useRef<HTMLDivElement>(null);
  const advancedRef = useRef<HTMLDivElement>(null);
  const activityRef = useRef<HTMLDivElement>(null);

  const sectionRefs: Record<InfoTab, React.RefObject<HTMLDivElement | null>> = {
    overview: overviewRef,
    advanced: advancedRef,
    activity: activityRef,
  };

  // Scroll spy — highlight the tab whose section is most visible
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    (["overview", "advanced", "activity"] as InfoTab[]).forEach((id) => {
      const el = sectionRefs[id].current;
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveTab(id);
        },
        { threshold: 0.25 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToSection = (id: InfoTab) => {
    sectionRefs[id].current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const tabs: { id: InfoTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "advanced", label: "Advanced" },
    { id: "activity", label: "Activity" },
  ];

  const isLendingPool = pool.borrowApyLabel != null;
  const hasTwoTokens =
    pool.token2.symbol && pool.token2.symbol !== pool.token1.symbol;

  return (
    <div className="mt-8">
      {/* Sticky scroll-spy nav */}
      <div
        className="sticky top-0 z-10 -mx-8 px-8 border-b border-white/5"
        style={{ background: "#111111" }}
      >
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => scrollToSection(t.id)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === t.id
                  ? "text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {t.label}
              {activeTab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Always-visible sections */}
      <div ref={overviewRef} className="mt-10 scroll-mt-16">
        <h2 className="text-white text-xl font-bold mb-6">Overview</h2>
        <h3 className="text-white/50 text-sm font-medium mb-2">
          Market Attributes
        </h3>
        <div>
          {isLendingPool ? (
            <>
              <MarketAttributeRow label="Collateral">
                <TokenLabel token={pool.token1} />
              </MarketAttributeRow>
              {hasTwoTokens && (
                <MarketAttributeRow label="Loan">
                  <TokenLabel token={pool.token2} />
                </MarketAttributeRow>
              )}
              {pool.liquidationLtv > 0 && (
                <MarketAttributeRow label="Liquidation LTV">
                  {pool.liquidationLtv}%
                </MarketAttributeRow>
              )}
              {pool.utilization && (
                <MarketAttributeRow label="Utilization">
                  {pool.utilization}
                </MarketAttributeRow>
              )}
            </>
          ) : (
            <>
              <MarketAttributeRow label="Token 1">
                <TokenLabel token={pool.token1} />
              </MarketAttributeRow>
              {hasTwoTokens && (
                <MarketAttributeRow label="Token 2">
                  <TokenLabel token={pool.token2} />
                </MarketAttributeRow>
              )}
            </>
          )}
          {pool.oraclePrice && (
            <MarketAttributeRow label="Oracle price">
              {pool.oraclePrice}
            </MarketAttributeRow>
          )}
          {pool.poolType && (
            <MarketAttributeRow label="Pool type">
              {pool.poolType}
              {pool.poolTypeDetail && (
                <span className="text-white/40 ml-1.5">
                  ({pool.poolTypeDetail})
                </span>
              )}
            </MarketAttributeRow>
          )}
        </div>
      </div>

      <div ref={advancedRef} className="mt-16 scroll-mt-16">
        <h2 className="text-white text-xl font-bold mb-6">Advanced</h2>
        <RatesChart
          poolId={pool.id}
          supplyApy={pool.supplyApy}
          borrowApy={pool.borrowApyLabel}
        />
      </div>

      <div ref={activityRef} className="mt-16 scroll-mt-16 pb-16">
        <h2 className="text-white text-xl font-bold mb-6">Activity</h2>
        <ActivityFeed poolId={pool.id} />
      </div>
    </div>
  );
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
  ammAmount2,
  ammMaxAmount,
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
      className="w-full rounded-2xl border border-white/7 grid grid-cols-1 lg:grid-cols-[1fr_24rem] items-start"
      style={{ background: "#111111" }}
    >
      {/* ── Left: scrollable info ─────────────────────────────────────────── */}
      <div className="min-w-0 p-8 lg:border-r border-white/7 order-2 lg:order-1">
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
            </div>
            <div className="flex items-center gap-4 mt-2.5 flex-wrap">
              <CopyAddress address={pool.contractAddress} />
              <div className="flex items-center gap-1.5">
                <Image
                  src="/assets/xlm-negro-logo.png"
                  alt="Stellar"
                  width={12}
                  height={12}
                  unoptimized
                  className="w-3 h-3 rounded-sm invert"
                />
                <span className="text-white/50 text-sm">{pool.network}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 mb-8" />

        {/* Metrics grid */}
        <div className="flex flex-wrap justify-between gap-y-7">
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

          {pool.totalBorrowed && (
            <div>
              <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
                Total Borrowed
              </p>
              <p className="text-white text-3xl font-bold tabular-nums leading-none">
                {pool.totalBorrowed}
              </p>
              {pool.totalBorrowedRaw && (
                <p className="text-white/30 text-xs mt-2 tabular-nums">
                  {pool.totalBorrowedRaw}
                </p>
              )}
            </div>
          )}

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

          {pool.borrowApyLabel != null && (
            <div>
              <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
                Borrow APY
              </p>
              <p className="text-white text-3xl font-bold tabular-nums leading-none">
                {pool.borrowApyLabel}
              </p>
            </div>
          )}

          {pool.poolType && (
            <div>
              <p className="text-white/40 text-xs font-medium mb-3 uppercase tracking-wider">
                Pool Type
              </p>
              <p className="text-white text-3xl font-bold tabular-nums leading-none">
                {pool.poolType}
              </p>
              {pool.poolTypeDetail && (
                <p className="text-white/30 text-xs mt-2 tabular-nums">
                  {pool.poolTypeDetail}
                </p>
              )}
            </div>
          )}

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

        {/* Divider */}
        <div className="border-t border-white/5 mt-10 mb-0" />

        {/* Info tabs */}
        <InfoTabs pool={pool} />
      </div>

      {/* ── Right: sticky panel ───────────────────────────────────────────── */}
      <div className="order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start h-auto">
        <div className="p-6 flex flex-col rounded-2xl lg:rounded-none lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto">
          <PoolDetailPanel
            pool={pool}
            type={type}
            isWalletConnected={isWalletConnected}
            supportsBorrow={supportsBorrow}
            depositWithdrawMode={depositWithdrawMode}
            ammTab={ammTab}
            onAmmTabChange={onAmmTabChange}
            ammAmount={ammAmount}
            ammAmount2={ammAmount2}
            ammMaxAmount={ammMaxAmount}
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
