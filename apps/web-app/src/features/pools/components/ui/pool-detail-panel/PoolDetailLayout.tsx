"use client";

import { InfoTabs } from "./InfoTabs";
import { PoolDetailHero } from "./PoolDetailHero";
import { PoolDetailMetrics } from "./PoolDetailMetrics";
import { PoolDetailPanel } from "./PoolDetailPanel";
import type { PoolDetailLayoutProps } from "./types";

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
  return (
    <div
      className="w-full rounded-2xl border border-white/7 grid grid-cols-1 lg:grid-cols-[1fr_24rem] items-start"
      style={{ background: "#111111" }}
    >
      <div className="min-w-0 p-8 lg:border-r border-white/7 order-2 lg:order-1">
        <PoolDetailHero pool={pool} />
        <div className="border-t border-white/5 mb-8" />
        <PoolDetailMetrics pool={pool} />
        <div className="border-t border-white/5 mt-10 mb-0" />
        <InfoTabs pool={pool} />
      </div>

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
