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
          className={`${circle} rounded-full bg-neko-teal border-2 border-neko-border flex items-center justify-center overflow-hidden shadow-md`}
        >
          {renderIcon(token1, "text-white")}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${wrap} shrink-0 flex items-center`}>
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 ${circle} rounded-full bg-neko-teal border-2 border-neko-border flex items-center justify-center overflow-hidden shadow-md z-1`}
      >
        {renderIcon(token1, "text-white")}
      </div>
      <div
        className={`absolute ${offset} top-1/2 -translate-y-1/2 ${circle} rounded-full bg-neko-teal-light border-2 border-neko-border flex items-center justify-center overflow-hidden shadow-md z-2`}
      >
        {renderIcon(token2, "text-neko-navy")}
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
    if (isDepositTab) onAmmAmountChange?.(pool.token1Balance ?? "0");
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
                  usdValue={borrowUsdValue}
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
                              {collateralInputUsd > 0
                                ? `$${collateralInputUsd.toFixed(2)}`
                                : "$0.00"}
                            </span>
                            <span className="text-white/30 tabular-nums">
                              {selectedCollateral.walletBalance ??
                                selectedCollateral.userBalance}{" "}
                              {selectedCollateral.symbol}
                            </span>
                          </div>

                          {collateralBelowMinimum && (
                            <p className="text-xs text-amber-400/80">
                              Minimum collateral value: $
                              {BLEND_MIN_COLLATERAL_USD.toFixed(2)}
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
                  {(parseFloat(pool.loanBalance ?? "0") * token2Price).toFixed(
                    2
                  )}
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
            <InfoRow
              label="Liquidation LTV"
              value={`${pool.liquidationLtv}%`}
            />
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
      className="w-full rounded-2xl border border-white/7 flex flex-col lg:flex-row lg:items-start"
      style={{ background: "#111111" }}
    >
      {/* ── Left: scrollable info ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 p-8 lg:border-r border-white/7 lg:min-h-dvh">
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
                  className="w-3 h-3 rounded-sm"
                />
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

      {/* ── Right: sticky panel ───────────────────────────────────────────── */}
      <div className="w-full lg:w-96 shrink-0 lg:sticky lg:top-0 lg:h-dvh flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden p-6 flex flex-col">
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
