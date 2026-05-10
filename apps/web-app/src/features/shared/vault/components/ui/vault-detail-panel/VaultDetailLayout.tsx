"use client";

import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { useVaultBalance } from "@/features/shared/vault/hooks/useVaultBalance";
import { useVaultAction } from "@/features/shared/vault/hooks/useVaultAction";
import { useVaultApy } from "@/features/shared/vault/hooks/useVaultApy";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { getTokenBalanceFromContract } from "@/lib/helpers/stellar/sorobanBalance";
import { VaultDetailHero } from "./VaultDetailHero";
import { VaultDetailMetrics } from "./VaultDetailMetrics";
import { VaultDetailInfo } from "./VaultDetailInfo";
import { VaultActionPanel } from "./VaultActionPanel";
import type { VaultDetailLayoutProps, VaultActionTab } from "./types";

const PANEL_SCROLL_CLASS =
  "pool-detail-scroll flex max-h-[min(calc(100dvh-7rem),calc(100svh-7rem))] flex-col overflow-y-auto overscroll-contain rounded-2xl bg-[#111111] p-6 lg:rounded-xl";


export function VaultDetailLayout({ vault, initialTab }: VaultDetailLayoutProps) {
  const [tab, setTab] = useState<VaultActionTab>(initialTab);
  const [amount, setAmount] = useState("");

  const { address } = useWallet();
  const vaultContractId = vault.detail?.contracts?.vault ?? null;

  const { vaultApy } = useVaultApy(vaultContractId);
  const liveApy7d =
    vaultApy != null && vaultApy > 0
      ? `${vaultApy.toFixed(2)}%`
      : vault.apy7d;

  const { price: tokenPriceUsd } = useTokenPrice(vault.supplyAsset.symbol);

  const { sharesFormatted } = useVaultBalance(vaultContractId);
  const { isLoading, handleDeposit, handleWithdraw } = useVaultAction(
    vaultContractId,
    vault.supplyAsset.symbol,
    vault.name
  );

  const { data: supplyBalance = "0" } = useQuery({
    queryKey: ["vaultSupplyBalance", vault.supplyAsset.contractAddress, address],
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

  const handleSubmit = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    if (tab === "deposit") {
      await handleDeposit(amount);
    } else {
      await handleWithdraw(amount);
    }
    setAmount("");
  }, [tab, amount, handleDeposit, handleWithdraw]);

  return (
    <div
      className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl"
      style={{ background: "#111111" }}
    >
      {/* Fixed right action panel */}
      <aside
        className="z-30 w-full min-w-0 shrink-0 lg:fixed lg:right-8 lg:top-28 lg:z-40 lg:w-[min(24rem,calc(100vw-4rem))] lg:max-w-[calc(100vw-4rem)] lg:p-0"
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
            supplyBalance={String(supplyBalance)}
            sharesBalance={sharesFormatted}
            isWalletConnected={!!address}
            apy={liveApy7d}
            tokenPriceUsd={tokenPriceUsd > 0 ? tokenPriceUsd : undefined}
          />
        </div>
      </aside>

      {/* Scrollable left content */}
      <section className="pool-detail-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-8 pb-8 pt-0 lg:pr-6 lg:mr-[calc(24rem+2rem)]">
        <div className="pt-8">
          <VaultDetailHero vault={vault} />
          <div className="border-t border-white/5 mb-8" />
          <VaultDetailMetrics vault={vault} liveApy={liveApy7d} />
          <div className="border-t border-white/5 mb-8" />
          <VaultDetailInfo vault={vault} />
        </div>
      </section>
    </div>
  );
}
