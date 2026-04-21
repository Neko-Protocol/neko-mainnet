"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import { stellarNetwork } from "@/lib/constants/network";

import { useLend } from "@/features/lending/hooks/useLend";
import { LendTable } from "@/features/lending/components/ui/LendTable";
import { LendModal } from "@/features/lending/components/ui/LendModal";
import MyLendingPositions from "@/features/lending/components/ui/MyLendingPositions";
import { BackstopPanel } from "@/features/lending/components/ui/BackstopPanel";

import { useBorrow } from "@/features/borrowing/hooks/useBorrow";
import { BorrowTable } from "@/features/borrowing/components/ui/BorrowTable";
import { BorrowModal } from "@/features/borrowing/components/ui/BorrowModal";
import MyBorrowPositions from "@/features/borrowing/components/ui/MyBorrowPositions";
import LiquidationsSection from "@/features/borrowing/components/ui/LiquidationsSection";

type Mode = "lending" | "borrowing";
type LendTab = "pools" | "backstop" | "positions";
type BorrowTab = "pools" | "liquidations" | "positions";

const showBackstop = stellarNetwork !== "PUBLIC";
const showLiquidations = stellarNetwork !== "PUBLIC";

const BANNER_CONFIG: Record<
  Mode,
  { title: string; subtitle: string; badge: string; imageSrc: string }
> = {
  lending: {
    title: "Lend to Pools",
    subtitle: "Supply liquidity to pools and earn interest on your assets",
    badge: "Use your actives",
    imageSrc: "/banners/lend.svg",
  },
  borrowing: {
    title: "Borrow assets",
    subtitle:
      "Select an option and start borrowing assets from liquidity pools",
    badge: "Need a hand?",
    imageSrc: "/banners/borrow.svg",
  },
};

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
    paginatedPools,
    isLoadingPools,
    isFetchingPools,
    poolsError,
    protocolFilter,
    setProtocolFilter,
    protocolOptions,
    page,
    totalRows,
    totalPages,
    rowsPerPage,
    setPage,
    changeRowsPerPage,
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
        <>
          <LendTable
            pools={pools}
            isLoading={isLoadingPools}
            isFetching={isFetchingPools}
            error={poolsError}
            onDeposit={(pool) => openModal(pool, true)}
            onWithdraw={(pool) => openModal(pool, false)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            protocolFilter={protocolFilter}
            onProtocolFilterChange={setProtocolFilter}
            protocolOptions={protocolOptions}
          />
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
        </>
      )}

      {showBackstop && activeTab === "backstop" && <BackstopPanel />}
      {activeTab === "positions" && <MyLendingPositions />}
    </>
  );
}

function BorrowingPanel() {
  const [activeTab, setActiveTab] = useState<BorrowTab>("pools");
  const borrowTabs = useMemo(
    () =>
      [
        { key: "pools" as const, label: "Pools" },
        ...(showLiquidations
          ? [{ key: "liquidations" as const, label: "Liquidations" }]
          : []),
        { key: "positions" as const, label: "My Positions" },
      ] as const,
    [showLiquidations]
  );
  const {
    assets,
    paginatedAssets,
    isLoading,
    isFetching,
    poolsError,
    selectedAsset,
    isProcessing,
    isWalletConnected,
    page,
    totalRows,
    totalPages,
    rowsPerPage,
    setPage,
    changeRowsPerPage,
    openModal,
    closeModal,
    handleSubmit,
  } = useBorrow();

  useEffect(() => {
    if (!showLiquidations && activeTab === "liquidations") {
      setActiveTab("pools");
    }
  }, [showLiquidations, activeTab]);

  return (
    <>
      <SubTabs
        tabs={[...borrowTabs]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "pools" && (
        <>
          <BorrowTable
            assets={assets}
            paginatedAssets={paginatedAssets}
            isLoading={isLoading}
            isFetching={isFetching}
            poolsError={poolsError}
            page={page}
            totalRows={totalRows}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onBorrow={openModal}
            onPageChange={setPage}
            onRowsPerPageChange={changeRowsPerPage}
          />
          {selectedAsset && (
            <BorrowModal
              asset={selectedAsset}
              isProcessing={isProcessing}
              isWalletConnected={isWalletConnected}
              onClose={closeModal}
              onSubmit={handleSubmit}
            />
          )}
        </>
      )}

      {showLiquidations && activeTab === "liquidations" && (
        <LiquidationsSection />
      )}
      {activeTab === "positions" && <MyBorrowPositions />}
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
  const [mode, setMode] = useState<Mode>("lending");
  const banner = BANNER_CONFIG[mode];

  return (
    <PageContainer maxWidth="6xl">
      <BannerPage
        title={banner.title}
        subtitle={banner.subtitle}
        badge={banner.badge}
        imageSrc={banner.imageSrc}
        imageAlt={`${mode} illustration`}
        className="mb-8"
      />

      {/* Top-level mode toggle */}
      <div className="flex items-center gap-0 rounded-2xl border border-white/10 bg-[#181818] p-1.5 w-fit mb-8">
        <button
          onClick={() => setMode("lending")}
          className={`relative rounded-xl px-7 py-2.5 text-sm font-bold transition-all duration-200 ${
            mode === "lending"
              ? "bg-[#229EDF] text-white shadow-lg shadow-[#229EDF]/20"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          Lending
        </button>
        <button
          onClick={() => setMode("borrowing")}
          className={`relative rounded-xl px-7 py-2.5 text-sm font-bold transition-all duration-200 ${
            mode === "borrowing"
              ? "bg-[#229EDF] text-white shadow-lg shadow-[#229EDF]/20"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          Borrowing
        </button>
      </div>

      {mode === "lending" ? <LendingPanel /> : <BorrowingPanel />}
    </PageContainer>
  );
}
