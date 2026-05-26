"use client";

import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { useVaultBalance } from "@/features/shared/vault/hooks/useVaultBalance";
import { useVaultAction } from "@/features/shared/vault/hooks/useVaultAction";
import { useVaultApy } from "@/features/shared/vault/hooks/useVaultApy";
import { useVaultData } from "@/features/shared/vault/hooks/useVaultData";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { convertUsdToSelected } from "@/lib/helpers/currency";
import { getTokenBalanceFromContract } from "@/lib/helpers/stellar/sorobanBalance";
import {
  atomicToDecimal,
  decimalToAtomic,
  mulDivFloor,
} from "@/lib/helpers/amount";
import { VaultDetailHero } from "./VaultDetailHero";
import { VaultDetailMetrics } from "./VaultDetailMetrics";
import { VaultDetailInfo } from "./VaultDetailInfo";
import { VaultActionPanel } from "./VaultActionPanel";
import { FirstVaultDepositSuccessModal } from "@/features/shared/vault/components/ui/FirstVaultDepositSuccessModal";
import type { VaultDetailLayoutProps, VaultActionTab } from "./types";

const PANEL_SCROLL_CLASS =
  "pool-detail-scroll flex max-h-[min(calc(100dvh-7rem),calc(100svh-7rem))] flex-col overflow-y-auto overscroll-contain rounded-2xl bg-[#111111] p-6 lg:rounded-xl";

export function VaultDetailLayout({
  vault,
  initialTab,
}: VaultDetailLayoutProps) {
  const [tab, setTab] = useState<VaultActionTab>(initialTab);
  const [amount, setAmount] = useState("");
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"about" | "action">("about");

  const { address } = useWallet();
  const vaultContractId = vault.detail?.contracts?.vault ?? null;

  const { vaultApy } = useVaultApy(vaultContractId);
  const liveApy7d =
    vaultApy != null && vaultApy > 0 ? `${vaultApy.toFixed(2)}%` : vault.apy7d;

  const { price: tokenPriceUsd } = useTokenPrice(vault.supplyAsset.symbol);
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });
  const tokenPriceInCurrency =
    tokenPriceUsd > 0 ? convertUsdToSelected(tokenPriceUsd, fxRate) : undefined;

  const { userShares, sharesFormatted } = useVaultBalance(vaultContractId);
  const { data: vaultData } = useVaultData(vaultContractId);
  const {
    isLoading,
    isConfirming,
    handleDeposit,
    handleWithdraw,
    showSuccess,
  } = useVaultAction(vaultContractId, vault.supplyAsset.symbol, vault.name);

  const { data: supplyBalance = "0" } = useQuery({
    queryKey: [
      "vaultSupplyBalance",
      vault.supplyAsset.contractAddress,
      address,
    ],
    queryFn: () =>
      getTokenBalanceFromContract(
        vault.supplyAsset.contractAddress!,
        address!,
        7
      ),
    enabled: !!address && !!vault.supplyAsset.contractAddress,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const handleTabChange = useCallback((t: VaultActionTab) => {
    setTab(t);
    setAmount("");
  }, []);

  const withdrawUnderlying =
    vaultData?.totalShares && vaultData.totalShares > 0n
      ? mulDivFloor(userShares, vaultData.tvl, vaultData.totalShares)
      : 0n;
  const withdrawBalance = atomicToDecimal(withdrawUnderlying, 7);

  const handleSubmit = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    if (tab === "deposit") {
      const { success, isFirstVaultDeposit } = await handleDeposit(amount);
      if (success) {
        setAmount("");
        if (isFirstVaultDeposit) {
          setSuccessModalOpen(true);
        } else {
          showSuccess(
            `Successfully deposited ${amount} ${vault.supplyAsset.symbol}`
          );
        }
      }
    } else {
      const withdrawRaw = decimalToAtomic(amount, 7);
      const maxWithdrawRaw = decimalToAtomic(withdrawBalance, 7);
      const success = await handleWithdraw(amount, {
        withdrawAll: maxWithdrawRaw > 0n && withdrawRaw >= maxWithdrawRaw,
      });
      if (success) setAmount("");
    }
  }, [
    tab,
    amount,
    withdrawBalance,
    vault.supplyAsset.symbol,
    handleDeposit,
    handleWithdraw,
    showSuccess,
  ]);

  return (
    <div
      className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl"
      style={{ background: "#111111" }}
    >
      {successModalOpen && (
        <FirstVaultDepositSuccessModal
          vaultName={vault.name}
          apy={liveApy7d ?? vault.apy7d ?? "—"}
          onClose={() => setSuccessModalOpen(false)}
        />
      )}
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
          About the Vault
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
          Actions
          {mobileTab === "action" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-white" />
          )}
        </button>
      </div>

      {/* Fixed right action panel */}
      <aside
        className={`${mobileTab === "action" ? "block" : "hidden"} lg:block z-30 w-full min-w-0 shrink-0 lg:fixed lg:right-8 lg:top-28 lg:z-40 lg:w-[min(24rem,calc(100vw-4rem))] lg:max-w-[calc(100vw-4rem)] lg:p-0`}
        aria-label="Vault actions"
      >
        <div className={PANEL_SCROLL_CLASS}>
          <VaultActionPanel
            vault={vault}
            tab={tab}
            onTabChange={handleTabChange}
            amount={amount}
            onAmountChange={setAmount}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            isConfirming={isConfirming}
            supplyBalance={String(supplyBalance)}
            sharesBalance={sharesFormatted}
            withdrawBalance={withdrawBalance}
            isWalletConnected={!!address}
            apy={liveApy7d}
            tokenPriceInCurrency={tokenPriceInCurrency}
            selectedCurrency={selectedCurrency}
          />
        </div>
      </aside>

      {/* Scrollable left content */}
      <section
        className={`${mobileTab === "about" ? "block" : "hidden"} lg:block pool-detail-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-8 pb-8 pt-0 lg:pr-6 lg:mr-104`}
      >
        <div className="pt-8">
          <VaultDetailHero vault={vault} />
          <div className="border-t border-white/5 mb-8" />
          <VaultDetailMetrics
            vault={vault}
            liveApy={liveApy7d}
            fxRate={fxRate}
            selectedCurrency={selectedCurrency}
          />
          <div className="border-t border-white/5 mb-8" />
          <VaultDetailInfo vault={vault} />
        </div>
      </section>
    </div>
  );
}
