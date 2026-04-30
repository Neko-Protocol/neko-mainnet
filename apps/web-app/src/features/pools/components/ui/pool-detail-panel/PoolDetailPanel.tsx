"use client";

import { useMemo, useState } from "react";
import { AmountInput } from "./AmountInput";
import { BlendCollateralCard } from "./BlendCollateralCard";
import { PoolPanelFooter } from "./PoolPanelFooter";
import { PoolPanelModeTabs } from "./PoolPanelModeTabs";
import { PoolSummaryRows } from "./PoolSummaryRows";
import type { PoolDetailPanelProps } from "./types";
import { usePoolDetailPanelLogic } from "@/features/pools/hooks/usePoolDetailPanelLogic";
import { BLEND_MIN_COLLATERAL_USD } from "./utils";

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

  const {
    token1Price,
    token2Price,
    selectedCollateralAddress,
    collateralInputAmount,
    setCollateralInputAmount,
    selectedCollateral,
    collateralInputUsd,
    dynamicBorrowMax,
    formatUsdValue,
    selectCollateral,
  } = usePoolDetailPanelLogic(pool);

  const isPair =
    pool.token2.symbol &&
    pool.token2.symbol !== pool.token1.symbol &&
    pool.token2.symbol !== "Lending" &&
    pool.token2.symbol !== "?";
  const pairLabel = isPair
    ? `${pool.token1.symbol}/${pool.token2.symbol}`
    : pool.token1.symbol;

  const collateralBelowMinimum =
    !!pool.collateralOptions?.length &&
    mode === "borrow" &&
    collateralInputAmount !== "" &&
    collateralInputUsd < BLEND_MIN_COLLATERAL_USD;

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

  const collateralUsdDisplay = formatUsdValue(
    Number.parseFloat(collateralUsdValue) || 0
  );
  const borrowUsdDisplay = formatUsdValue(
    Number.parseFloat(borrowUsdValue) || 0
  );
  const collateralInputUsdDisplay = formatUsdValue(collateralInputUsd);

  return (
    <div className="flex w-full flex-col gap-3">
      <PoolPanelModeTabs
          depositWithdrawMode={depositWithdrawMode}
          ammTab={ammTab}
          onAmmTabChange={onAmmTabChange}
          supportsBorrow={supportsBorrow}
          lendingTabs={lendingTabs}
          mode={mode}
          setMode={setMode}
        />

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
                usdValue={collateralUsdDisplay}
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
                  usdValue={borrowUsdDisplay}
                />
                {borrowExceedsHf && (
                  <p className="text-xs text-red-400/90 px-0.5">
                    Borrow amount exceeds your collateral limit (~
                    {dynamicBorrowMax!.toFixed(4)} {pool.token2.symbol} max)
                  </p>
                )}

                {pool.collateralOptions &&
                  pool.collateralOptions.length > 0 && (
                    <BlendCollateralCard
                      options={pool.collateralOptions}
                      selectedCollateralAddress={selectedCollateralAddress}
                      onSelectCollateral={selectCollateral}
                      collateralInputAmount={collateralInputAmount}
                      onCollateralInputChange={setCollateralInputAmount}
                      selectedCollateral={selectedCollateral}
                      isWalletConnected={isWalletConnected}
                      collateralInputUsd={collateralInputUsd}
                      formatUsdValue={formatUsdValue}
                      collateralBelowMinimum={collateralBelowMinimum}
                    />
                  )}
              </>
            )}
          </>
        )}

        <PoolSummaryRows
          pool={pool}
          mode={mode}
          isPair={!!isPair}
          pairLabel={pairLabel}
          collateralAmount={collateralAmount}
          collateralUsdDisplay={collateralUsdDisplay}
          borrowAmount={borrowAmount}
          borrowUsdDisplay={borrowUsdDisplay}
          selectedCollateral={selectedCollateral}
          collateralInputAmount={collateralInputAmount}
          collateralInputUsdDisplay={collateralInputUsdDisplay}
        />

        <PoolPanelFooter
          depositWithdrawMode={depositWithdrawMode}
          isWalletConnected={isWalletConnected}
          onAmmSubmit={onAmmSubmit}
          ammSubmitDisabled={ammSubmitDisabled}
          isAmmSubmitting={isAmmSubmitting}
          isDepositTab={isDepositTab}
          supportsBorrow={supportsBorrow}
          canLend={canLend}
          canBorrow={canBorrow}
          mode={mode}
          onLendSubmit={onLendSubmit}
          collateralAmount={collateralAmount}
          isLendingActionPending={isLendingActionPending}
          onBorrowSubmit={onBorrowSubmit}
          borrowAmount={borrowAmount}
          selectedCollateral={selectedCollateral}
          collateralInputAmount={collateralInputAmount}
          collateralBelowMinimum={collateralBelowMinimum}
          poolCollateralOptionsLength={pool.collateralOptions?.length ?? 0}
          borrowExceedsHf={borrowExceedsHf}
        />
    </div>
  );
}
