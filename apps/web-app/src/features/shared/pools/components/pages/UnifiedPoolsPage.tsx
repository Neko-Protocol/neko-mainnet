"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import { stellarNetwork } from "@/lib/constants/network";

import { useLend } from "@/features/shared/lending/hooks/useLend";
import { LendTable } from "@/features/shared/lending/components/ui/LendTable";
import { LendModal } from "@/features/shared/lending/components/ui/LendModal";
import MyLendingPositions from "@/features/shared/lending/components/ui/MyLendingPositions";
import { BackstopPanel } from "@/features/shared/lending/components/ui/BackstopPanel";

type LendTab = "pools" | "backstop" | "positions";

const showBackstop = stellarNetwork !== "PUBLIC";

function LendingPanel() {
  const [activeTab, setActiveTab] = useState<LendTab>("pools");
  const lendTabs = useMemo(
    () =>
      [
        { key: "pools" as const, label: "Pools" },
        ...(showBackstop
          ? [{ key: "backstop" as const, label: "Backstop" }]
          : []),
        { key: "positions" as const, label: "My Positions" },
      ] as const,
    [showBackstop]
  );
  const {
    pools,
    isLoadingPools,
    isFetchingPools,
    poolsError,
    protocolFilter,
    setProtocolFilter,
    protocolOptions,
    selectedPool,
    isModalOpen,
    isDeposit,
    isLoading,
    bTokenBalance,
    isLoadingBalance,
    hasWallet,
    openModal,
    closeModal,
    handleConfirm,
    refreshBalance,
    searchQuery,
    setSearchQuery,
  } = useLend();

  useEffect(() => {
    if (!showBackstop && activeTab === "backstop") {
      setActiveTab("pools");
    }
  }, [showBackstop, activeTab]);

  return (
    <>
      <SubTabs
        tabs={[...lendTabs]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "pools" && (
        <LendTable
          pools={pools}
          isLoading={isLoadingPools}
          isFetching={isFetchingPools}
          error={poolsError}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          protocolFilter={protocolFilter}
          onProtocolFilterChange={setProtocolFilter}
          protocolOptions={protocolOptions}
        />
      )}

      {isModalOpen && selectedPool && (
        <LendModal
          pool={selectedPool}
          isDeposit={isDeposit}
          isLoading={isLoading}
          bTokenBalance={bTokenBalance}
          isLoadingBalance={isLoadingBalance}
          hasWallet={hasWallet}
          onClose={closeModal}
          onConfirm={handleConfirm}
          onRefreshBalance={() => void refreshBalance()}
        />
      )}

      {showBackstop && activeTab === "backstop" && <BackstopPanel />}
      {activeTab === "positions" && (
        <MyLendingPositions
          onWithdraw={(assetCode, protocolId, depositedRaw, orchestratorId) => {
            const pool = pools.find((p) =>
              orchestratorId
                ? p.orchestratorId === orchestratorId
                : p.protocolId === protocolId && p.assetCode === assetCode
            );
            if (pool)
              openModal({ ...pool, depositedAmount: depositedRaw }, false);
          }}
        />
      )}
    </>
  );
}

function SubTabs<T extends string>({
  tabs,
  active,
  onChange,
  trailing,
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-6 flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 w-fit max-w-full flex-wrap items-center gap-1 rounded-xl bg-[#1C1C1C] p-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
              active === key
                ? "bg-[#229EDF] text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {trailing ? <div className="ml-auto shrink-0">{trailing}</div> : null}
    </div>
  );
}

export default function UnifiedPoolsPage() {
  return (
    <PageContainer maxWidth="6xl">
      <BannerPage
        title="Lend to Pools"
        subtitle="Supply liquidity to pools and earn interest on your assets"
        badge="Use your actives"
        imageSrc="/banners/lend.svg"
        imageAlt="lending illustration"
        className="mb-8"
      />

      <LendingPanel />
    </PageContainer>
  );
}
