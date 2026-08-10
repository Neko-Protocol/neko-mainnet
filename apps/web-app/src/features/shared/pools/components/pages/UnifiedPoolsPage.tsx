"use client";

import { Suspense, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import { useLend } from "@/features/shared/lending/hooks/useLend";
import { LendTable } from "@/features/shared/lending/components/ui/LendTable";
import { LendModal } from "@/features/shared/lending/components/ui/LendModal";
import MyLendingPositions from "@/features/shared/lending/components/ui/MyLendingPositions";

type LendTab = "pools" | "positions";

const VALID_TABS: LendTab[] = ["pools", "positions"];

function LendingPanel() {
  const t = useTranslations("sharedPools.unifiedPage");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as LendTab | null;
  const [activeTab, setActiveTab] = useState<LendTab>(
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "pools"
  );

  function handleTabChange(key: LendTab) {
    setActiveTab(key);
    const params = new URLSearchParams(searchParams.toString());
    if (key === "pools") {
      params.delete("tab");
    } else {
      params.set("tab", key);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }
  const lendTabs = useMemo(
    () =>
      [
        { key: "pools" as const, label: t("tabPools") },
        { key: "positions" as const, label: t("tabPositions") },
      ] as const,
    [t]
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
    closeModal,
    handleConfirm,
    refreshBalance,
    searchQuery,
    setSearchQuery,
  } = useLend();

  const effectiveTab = activeTab;

  return (
    <>
      <SubTabs
        tabs={[...lendTabs]}
        active={effectiveTab}
        onChange={handleTabChange}
      />

      {effectiveTab === "pools" && (
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

      {effectiveTab === "positions" && <MyLendingPositions />}
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
  const t = useTranslations("sharedPools.unifiedPage");
  return (
    <PageContainer maxWidth="7xl">
      <BannerPage
        title={t("title")}
        subtitle={t("subtitle")}
        badge={t("badge")}
        imageSrc="/banners/lend.svg"
        imageAlt={t("imageAlt")}
        imageLayoutClassName="right-0 top-3 h-full w-[75%] opacity-60 sm:top-0 sm:w-[55%] sm:opacity-100"
        className="mb-8"
      />

      <Suspense>
        <LendingPanel />
      </Suspense>
    </PageContainer>
  );
}
