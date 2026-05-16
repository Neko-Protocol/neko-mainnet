"use client";

import React from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { useDashboardPositions } from "@/features/expert/dashboard/hooks/useDashboardPositions";
import { useDashboardVaultPositions } from "@/features/expert/dashboard/hooks/useDashboardVaultPositions";
import { YourPositionsTable } from "./YourPositionsTable";
import { VaultPositionsTable } from "./VaultPositionsTable";

function SectionSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-2xl bg-[#1C1C1C] border border-white/5 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
        <span className="text-white/30 text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="p-6 flex items-center justify-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white/50" />
        <span className="text-white/30 text-xs">
          Loading {label.toLowerCase()}...
        </span>
      </div>
    </div>
  );
}

const YourPositions: React.FC = () => {
  const { positions, isLoading, isError, hasWallet, refetch } =
    useDashboardPositions();
  const { positions: vaultPositions, isLoading: vaultLoading } =
    useDashboardVaultPositions();

  if (!hasWallet) return null;

  const hasPoolData = positions.length > 0;
  const hasVaultData = vaultPositions.length > 0;
  const nothingYet = isLoading && vaultLoading && !hasPoolData && !hasVaultData;
  const bothDone = !isLoading && !vaultLoading;
  const emptyState = bothDone && !hasPoolData && !hasVaultData && !isError;

  return (
    <div className="w-full">
      <div className="mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          Your Positions
        </h2>
      </div>

      {nothingYet ? (
        <div className="rounded-2xl bg-[#1C1C1C] border border-white/5 p-10 flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white/60" />
          <span className="text-white/40 text-sm">Loading positions...</span>
        </div>
      ) : emptyState ? (
        <div className="rounded-2xl bg-[#1C1C1C] border border-white/5 p-10 text-center">
          <Layers className="h-8 w-8 text-white/20 mx-auto mb-3" />
          <p className="text-white font-semibold text-sm mb-1">
            No active positions
          </p>
          <p className="text-white/40 text-xs mb-5">
            Deposit into a pool or vault to start earning yield
          </p>
          <Link
            href="/pools"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#2A2A2A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#333] transition-colors"
          >
            Explore Pools
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {hasPoolData && <YourPositionsTable positions={positions} />}
          {isLoading && !hasPoolData && !isError && (
            <SectionSkeleton label="Pools" />
          )}
          {isError && !hasPoolData && (
            <div className="rounded-2xl bg-[#1C1C1C] border border-white/5 p-8 text-center">
              <p className="text-white font-semibold text-sm mb-1">
                Couldn&apos;t load pool positions
              </p>
              <p className="text-white/40 text-xs mb-4">
                Network error — please try again
              </p>
              <button
                onClick={refetch}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#2A2A2A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#333] transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {hasVaultData && <VaultPositionsTable positions={vaultPositions} />}
          {vaultLoading && !hasVaultData && <SectionSkeleton label="Vaults" />}
        </div>
      )}
    </div>
  );
};

export default YourPositions;
