"use client";

import React, { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
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
} from "@neko/orchestrator";
import { VaultDetailHero } from "./VaultDetailHero";
import { VaultDetailMetrics } from "./VaultDetailMetrics";
import { VaultDetailInfo } from "./VaultDetailInfo";
import { VaultActionPanel } from "./VaultActionPanel";
import { LiveEarningsCard } from "./LiveEarningsCard";
import { YourActivityFeed } from "./YourActivityFeed";
import { FirstVaultDepositSuccessModal } from "@/features/shared/vault/components/ui/FirstVaultDepositSuccessModal";
import { MultisigPendingModal } from "@/features/shared/vault/components/ui/MultisigPendingModal";
import { auditService } from "@/lib/services/audit.service";
import { computeCurrentVaultSession } from "@/features/shared/vault/hooks/useVaultEarningsCard";
import type { VaultDetailLayoutProps, VaultActionTab } from "./types";

const PANEL_SCROLL_CLASS =
  "pool-detail-scroll flex max-h-[min(calc(100dvh-7rem),calc(100svh-7rem))] flex-col overflow-y-auto overscroll-contain rounded-2xl bg-[#111111] p-6 lg:rounded-xl";

export function VaultDetailLayout({
  vault,
  initialTab,
}: VaultDetailLayoutProps) {
  const t = useTranslations("sharedVault.detail");
  const tAction = useTranslations("sharedVault.action");
  const [tab, setTab] = useState<VaultActionTab>(initialTab);
  const [amount, setAmount] = useState("");
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [multisigPending, setMultisigPending] = useState<{
    hash: string;
    action: "deposit" | "withdraw";
    amount: string;
  } | null>(null);
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
    handleClaimEarnings: claimEarnings,
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

  const { data: auditLogs } = useQuery({
    queryKey: ["vaultAuditActivity", address],
    queryFn: () => auditService.getActivity(address!, 50),
    enabled: !!address,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const positionSummary = (() => {
    if (!auditLogs || !vaultContractId) return undefined;
    const vaultLogs = auditLogs.filter(
      (l) =>
        l.pool_id === vaultContractId &&
        (l.action_type === "vaults_deposit" ||
          l.action_type === "vaults_withdraw" ||
          l.action_type === "vaults_claim_earnings")
    );
    const { netDeposited, hasData } = computeCurrentVaultSession(vaultLogs);
    if (!hasData || netDeposited <= 0) return undefined;
    const currentValue = parseFloat(withdrawBalance) || 0;
    if (currentValue <= 0) return undefined;
    return {
      netDeposited,
      currentValue,
      earnings: currentValue - netDeposited,
      assetSymbol: vault.supplyAsset.symbol,
    };
  })();

  const firstDepositMs = (() => {
    if (!auditLogs || !vaultContractId) return null;
    const vaultLogs = auditLogs.filter(
      (l) =>
        l.pool_id === vaultContractId &&
        (l.action_type === "vaults_deposit" ||
          l.action_type === "vaults_withdraw" ||
          l.action_type === "vaults_claim_earnings")
    );
    const deposits = vaultLogs.filter(
      (l) => l.action_type === "vaults_deposit"
    );
    if (deposits.length === 0) return null;
    return deposits.reduce((earliest, l) => {
      const ts = new Date(l.created_at).getTime();
      return ts < earliest ? ts : earliest;
    }, new Date(deposits[0].created_at).getTime());
  })();

  const effectiveApy = (() => {
    if (!positionSummary || firstDepositMs == null) return null;
    const holdingDays = (Date.now() - firstDepositMs) / 86400000;
    if (positionSummary.netDeposited <= 0 || holdingDays < 1) {
      return null;
    }
    return (
      (Math.max(0, positionSummary.earnings) / positionSummary.netDeposited) *
      (365 / holdingDays) *
      100
    );
  })();

  const apyForLive =
    effectiveApy ?? (parseFloat((liveApy7d ?? "").replace(/[^\d.]/g, "")) || 0);

  const positionNetDeposited = positionSummary?.netDeposited ?? 0;
  const positionEarnings = positionSummary?.earnings ?? 0;
  const handleClaimEarnings = useCallback(async () => {
    if (positionEarnings < 0.001 || positionNetDeposited <= 0) return;
    await claimEarnings(positionNetDeposited);
  }, [positionEarnings, positionNetDeposited, claimEarnings]);

  const handleSubmit = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    if (tab === "deposit") {
      const {
        success,
        isFirstVaultDeposit,
        multisigPending: pendingDeposit,
      } = await handleDeposit(amount);
      if (pendingDeposit) {
        setMultisigPending({
          hash: pendingDeposit.hash,
          action: "deposit",
          amount,
        });
        setAmount("");
        return;
      }
      if (success) {
        setAmount("");
        if (isFirstVaultDeposit) {
          setSuccessModalOpen(true);
        } else {
          showSuccess(
            tAction("depositSuccessToast", {
              amount,
              symbol: vault.supplyAsset.symbol,
            })
          );
        }
      }
    } else {
      const withdrawRaw = decimalToAtomic(amount, 7);
      const maxWithdrawRaw = decimalToAtomic(withdrawBalance, 7);
      const result = await handleWithdraw(amount, {
        withdrawAll: maxWithdrawRaw > 0n && withdrawRaw >= maxWithdrawRaw,
      });
      if (result.multisigPending) {
        setMultisigPending({
          hash: result.multisigPending.hash,
          action: "withdraw",
          amount,
        });
        setAmount("");
        return;
      }
      if (result.success) setAmount("");
    }
  }, [
    tab,
    amount,
    withdrawBalance,
    vault.supplyAsset.symbol,
    handleDeposit,
    handleWithdraw,
    showSuccess,
    tAction,
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
      {multisigPending && (
        <MultisigPendingModal
          open
          onClose={() => setMultisigPending(null)}
          hash={multisigPending.hash}
          action={multisigPending.action}
          amount={multisigPending.amount}
          assetSymbol={vault.supplyAsset.symbol}
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
          {t("aboutTab")}
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
          {t("actionsTab")}
          {mobileTab === "action" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-white" />
          )}
        </button>
      </div>

      {/* Fixed right action panel */}
      <aside
        className={`${mobileTab === "action" ? "block" : "hidden"} lg:block z-30 w-full min-w-0 shrink-0 lg:fixed lg:right-8 lg:top-28 lg:z-40 lg:w-[min(24rem,calc(100vw-4rem))] lg:max-w-[calc(100vw-4rem)] lg:p-0`}
        aria-label={t("actionsAriaLabel")}
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
            positionSummary={positionSummary}
            onClaimEarnings={positionSummary ? handleClaimEarnings : undefined}
            isClaimingEarnings={isLoading || isConfirming}
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
          {address && vaultContractId && positionSummary && (
            <>
              <LiveEarningsCard
                vaultId={vaultContractId}
                userShares={userShares}
                assetSymbol={vault.supplyAsset.symbol}
                currentValue={positionSummary.currentValue}
                netDeposited={positionSummary.netDeposited}
                firstDepositMs={firstDepositMs}
                apyPercent={apyForLive}
                tokenPriceInCurrency={tokenPriceInCurrency}
                selectedCurrency={selectedCurrency}
              />
              <div className="mt-8">
                <YourActivityFeed
                  logs={auditLogs}
                  vaultId={vaultContractId}
                  assetSymbol={vault.supplyAsset.symbol}
                />
              </div>
              <div className="border-t border-white/5 my-8" />
            </>
          )}
          <VaultDetailInfo vault={vault} />
        </div>
      </section>
    </div>
  );
}
