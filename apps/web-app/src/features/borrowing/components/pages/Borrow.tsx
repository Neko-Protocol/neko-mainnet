"use client";

import { useEffect, useState } from "react";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import { stellarNetwork } from "@/lib/constants/network";
import { useBorrow } from "../../hooks/useBorrow";
import { BorrowTable } from "../ui/BorrowTable";
import { BorrowModal } from "../ui/BorrowModal";
import MyPositions from "@/features/lending/components/ui/MyLendingPositions";
import LiquidationsSection from "../ui/LiquidationsSection";

type PageTab = "pools" | "liquidations" | "positions";

const showLiquidations = stellarNetwork !== "PUBLIC";

const Borrow: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PageTab>("pools");
  const {
    assets,
    paginatedAssets,
    isLoading,
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
    <PageContainer maxWidth="6xl">
      <BannerPage
        title="Borrow assets"
        subtitle="Select an option and start borrowing assets from liquidity pools"
        badge="Need a hand?"
        imageSrc="/banners/borrow.svg"
        imageAlt="Borrow illustration"
        className="mb-8"
      />

      <div className="flex items-center gap-1 rounded-xl bg-[#1C1C1C] p-1 w-fit mb-6">
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
        {showLiquidations && (
          <button
            onClick={() => setActiveTab("liquidations")}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === "liquidations"
                ? "bg-[#229EDF] text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Liquidations
          </button>
        )}
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

      {activeTab === "pools" && (
        <>
          <BorrowTable
            assets={assets}
            paginatedAssets={paginatedAssets}
            isLoading={isLoading}
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

      {activeTab === "positions" && <MyPositions defaultTab="borrow" />}
    </PageContainer>
  );
};

export default Borrow;
