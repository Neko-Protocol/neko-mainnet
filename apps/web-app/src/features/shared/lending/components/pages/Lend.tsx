"use client";

import { useState } from "react";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import { useLend } from "../../hooks/useLend";
import { LendTable } from "../ui/LendTable";
import { LendProtocolFilter } from "../ui/LendProtocolFilter";
import { LendModal } from "../ui/LendModal";
import MyLendingPositions from "../ui/MyLendingPositions";

type PageTab = "pools" | "positions";

const Lend: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PageTab>("pools");
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
    closeModal,
    handleConfirm,
    refreshBalance,
  } = useLend();

  return (
    <PageContainer maxWidth="6xl">
      <BannerPage
        title="Lend to Pools"
        subtitle="Supply liquidity to pools and earn interest on your assets"
        badge="Use your actives"
        imageSrc="/banners/lend.svg"
        imageAlt="Lend illustration"
        className="mb-8"
      />

      <div className="mb-6 flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 w-fit max-w-full flex-wrap items-center gap-1 rounded-xl bg-[#1C1C1C] p-1">
          <button
            onClick={() => setActiveTab("pools")}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === "pools"
                ? "bg-[#229EDF] text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Pools
          </button>
          <button
            onClick={() => setActiveTab("positions")}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === "positions"
                ? "bg-[#229EDF] text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            My Positions
          </button>
        </div>
        {activeTab === "pools" && protocolOptions.length > 0 && (
          <div className="ml-auto shrink-0">
            <LendProtocolFilter
              value={protocolFilter}
              onChange={setProtocolFilter}
              options={protocolOptions}
              disabled={isLoadingPools}
            />
          </div>
        )}
      </div>

      {activeTab === "pools" && (
        <LendTable
          pools={pools}
          isLoading={isLoadingPools}
          isFetching={isFetchingPools}
          error={poolsError}
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

      {activeTab === "positions" && <MyLendingPositions />}
    </PageContainer>
  );
};

export default Lend;
