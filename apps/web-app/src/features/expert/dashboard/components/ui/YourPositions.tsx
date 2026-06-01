"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { useDashboardPositions } from "@/features/expert/dashboard/hooks/useDashboardPositions";
import { useDashboardVaultPositions } from "@/features/expert/dashboard/hooks/useDashboardVaultPositions";
import { useBearingYieldPositions } from "@/features/expert/dashboard/hooks/useBearingYieldPositions";
import { useEtherfuseYields } from "@/features/simulator/hooks/useEtherfuseYields";
import { YourPositionsTable } from "./YourPositionsTable";
import MyVaultPositions from "@/features/shared/vault/components/ui/MyVaultPositions";
import { BearingYieldTable } from "./BearingYieldTable";

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

  const vaultViews = useMemo(
    () => vaultPositions.map((p) => p.vault),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vaultPositions.map((p) => p.vault.id).join(",")]
  );

  const vaultBalances = useMemo(() => {
    const map: Record<string, bigint> = {};
    for (const { vault, userShares } of vaultPositions) {
      map[vault.id] = userShares;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultPositions.map((p) => `${p.vault.id}:${p.userShares}`).join(",")]);
  const { positions: bearingYieldPositions, isLoading: bearingLoading } =
    useBearingYieldPositions(vaultPositions);
  const { data: etherfuseYields } = useEtherfuseYields();
  const yieldsMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of etherfuseYields ?? []) {
      map[entry.symbol.toUpperCase()] = entry.apy;
    }
    return map;
  }, [etherfuseYields]);

  if (!hasWallet) return null;

  const hasPoolData = positions.length > 0;
  const hasVaultData = vaultPositions.length > 0;
  const hasBearingData = bearingYieldPositions.length > 0;
  const nothingYet =
    isLoading &&
    vaultLoading &&
    bearingLoading &&
    !hasPoolData &&
    !hasVaultData &&
    !hasBearingData;
  const allDone = !isLoading && !vaultLoading && !bearingLoading;
  const emptyState =
    allDone && !hasPoolData && !hasVaultData && !hasBearingData && !isError;

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

          {hasVaultData && (
            <MyVaultPositions
              vaults={vaultViews}
              userBalances={vaultBalances}
            />
          )}
          {vaultLoading && !hasVaultData && <SectionSkeleton label="Vaults" />}

          {hasBearingData && (
            <BearingYieldTable
              positions={bearingYieldPositions}
              yieldsMap={yieldsMap}
            />
          )}
          {bearingLoading && !hasBearingData && (
            <SectionSkeleton label="Bearing Yield Assets" />
          )}
        </div>
      )}
    </div>
  );
};

export default YourPositions;
