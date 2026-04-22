"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import { usePoolsData } from "@/features/pools/hooks/usePoolsData";
import type { PoolTypeFilter } from "@/features/pools/hooks/usePoolsData";
import { PoolsTable } from "@/features/pools/components/ui/PoolsTable";
import MyBalances from "@/features/pools/components/ui/MyBalances";

type PageTab = "pools" | "balances";

const POOL_FILTERS: { label: string; value: PoolTypeFilter }[] = [
  { label: "All", value: "all" },
  { label: "Lending", value: "lending" },
  { label: "AMM", value: "amm" },
];

const Pools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PageTab>("pools");
  const {
    pools,
    isLoading,
    isFetching,
    error,
    typeFilter,
    setTypeFilter,
    searchQuery,
    setSearchQuery,
  } = usePoolsData();

  return (
    <PageContainer maxWidth="7xl">
      <BannerPage
        title="Liquidity Pools"
        subtitle="Explore and join liquidity pools to earn fees and interest on your assets"
        badge="Discover"
        imageSrc="/banners/lend.svg"
        imageAlt="Pools illustration"
        className="mb-8"
      />

      {/* Tab switcher */}
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
        <button
          onClick={() => setActiveTab("balances")}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
            activeTab === "balances"
              ? "bg-[#229EDF] text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          My Positions
        </button>
      </div>

      {activeTab === "pools" && (
        <>
          {/* Unified toolbar: filters left, search right */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              {POOL_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setTypeFilter(f.value)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    typeFilter === f.value
                      ? "bg-[#2A2A2A] text-white border border-white/10"
                      : "bg-transparent text-white/40 hover:text-white/70"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="text"
                placeholder="Search by token..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#2A2A2A] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-[#229EDF]/50 transition-colors"
              />
            </div>
          </div>

          {/* Pools table */}
          <PoolsTable
            pools={pools}
            isLoading={isLoading}
            isFetching={isFetching}
            error={error}
          />
        </>
      )}

      {activeTab === "balances" && <MyBalances />}
    </PageContainer>
  );
};

export default Pools;
