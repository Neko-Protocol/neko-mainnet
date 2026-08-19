"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { InfoTabs } from "./InfoTabs";
import { PoolDetailHero } from "./PoolDetailHero";
import { PoolDetailMetrics } from "./PoolDetailMetrics";
import { PoolDetailPanel } from "./PoolDetailPanel";
import { POOL_DETAIL_MAIN_SCROLL_ID } from "./scrollIds";
import type { PoolDetailLayoutProps } from "./types";

const panelInnerScroll =
  "pool-detail-scroll flex max-h-[min(calc(100dvh-7rem),calc(100svh-7rem))] flex-col overflow-y-auto overscroll-contain rounded-2xl bg-[#111111] p-6 lg:rounded-xl";

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
  ammMaxAmount2,
  onAmmAmountChange,
  onAmmAmount2Change,
  onAmmSubmit,
  isAmmSubmitting,
  ammSubmitDisabled,
  ammInsufficientFundsMessage,
  canLend,
  canWithdraw,
  canBorrow,
  onLendSubmit,
  onWithdrawSubmit,
  onBorrowSubmit,
  isLendingActionPending,
}: PoolDetailLayoutProps) {
  const [mobileTab, setMobileTab] = useState<"about" | "action">("about");
  const t = useTranslations("sharedPools.layout");

  return (
    <div
      className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl"
      style={{ background: "#111111" }}
    >
      {/* Mobile tab bar */}
      <div className="lg:hidden shrink-0 flex border-b border-white/10">
        <button
          type="button"
          onClick={() => setMobileTab("about")}
          className={`relative flex-1 py-3 text-sm font-medium transition-colors ${
            mobileTab === "about"
              ? "text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          {t("aboutPool")}
          {mobileTab === "about" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-white" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("action")}
          className={`relative flex-1 py-3 text-sm font-medium transition-colors ${
            mobileTab === "action"
              ? "text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          {t("actions")}
          {mobileTab === "action" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-white" />
          )}
        </button>
      </div>

      {/* lg: viewport-fixed panel; reserve space so main column does not sit underneath */}
      <aside
        className={`${mobileTab === "action" ? "block" : "hidden"} lg:block z-30 w-full min-w-0 shrink-0 lg:fixed lg:right-8 lg:top-28 lg:z-40 lg:w-[min(24rem,calc(100vw-4rem))] lg:max-w-[calc(100vw-4rem)] lg:p-0`}
        aria-label="Pool actions"
      >
        <div className={panelInnerScroll}>
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
            ammMaxAmount2={ammMaxAmount2}
            onAmmAmountChange={onAmmAmountChange}
            onAmmAmount2Change={onAmmAmount2Change}
            onAmmSubmit={onAmmSubmit}
            isAmmSubmitting={isAmmSubmitting}
            ammSubmitDisabled={ammSubmitDisabled}
            ammInsufficientFundsMessage={ammInsufficientFundsMessage}
            canLend={canLend}
            canWithdraw={canWithdraw}
            canBorrow={canBorrow}
            onLendSubmit={onLendSubmit}
            onWithdrawSubmit={onWithdrawSubmit}
            onBorrowSubmit={onBorrowSubmit}
            isLendingActionPending={isLendingActionPending}
          />
        </div>
      </aside>

      <section
        id={POOL_DETAIL_MAIN_SCROLL_ID}
        className={`${mobileTab === "about" ? "block" : "hidden"} lg:block pool-detail-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-8 pb-8 pt-0 lg:pr-6 lg:mr-[calc(24rem+2rem)]`}
      >
        {/* pt-8 here (not on section) so sticky tab bar top-0 meets scrollport edge and blur covers the top */}
        <div className="pt-8">
          <PoolDetailHero pool={pool} />
          <div className="border-t border-white/5 mb-8" />
          <PoolDetailMetrics pool={pool} />
          <div className="border-t border-white/5 mt-10 mb-0" />
        </div>
        <InfoTabs pool={pool} />
      </section>
    </div>
  );
}
