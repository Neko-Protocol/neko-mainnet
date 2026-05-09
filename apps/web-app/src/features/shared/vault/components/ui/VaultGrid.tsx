"use client";

import React from "react";
import { Vault } from "lucide-react";
import { parseDefindexVaultIds } from "@/lib/defindex/vaultIds";
import type { VaultView } from "../../types/vault";
import { VaultCard } from "./VaultCard";

const VaultCardSkeleton = () => (
  <div className="isolate flex flex-col rounded-2xl overflow-hidden border border-white/5">
    <div className="relative overflow-hidden bg-[#242424] min-h-[124px] px-5 py-4">
      <div className="flex items-center gap-3 pr-[46%]">
        <div className="h-12 w-12 rounded-full bg-white/10" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 w-32 rounded bg-white/10" />
          <div className="h-5 w-16 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
    <div className="flex items-stretch px-5 py-3 bg-[#181818]">
      <div className="flex-1 space-y-2">
        <div className="h-3 w-40 rounded bg-white/10" />
        <div className="h-3 w-32 rounded bg-white/10" />
      </div>
      <div className="w-px bg-white/8 mx-4 shrink-0" />
      <div className="space-y-2">
        <div className="h-2 w-10 rounded bg-white/10" />
        <div className="h-5 w-16 rounded bg-white/10" />
      </div>
      <div className="w-px bg-white/8 mx-4 shrink-0" />
      <div className="space-y-2">
        <div className="h-2 w-12 rounded bg-white/10" />
        <div className="h-5 w-14 rounded bg-white/10" />
      </div>
    </div>
    <div className="flex gap-2 px-4 py-3 bg-[#181818]">
      <div className="h-8 flex-1 rounded-xl bg-white/10" />
      <div className="h-8 flex-1 rounded-xl bg-white/10" />
    </div>
  </div>
);

export interface VaultGridProps {
  vaults: VaultView[];
  isLoading?: boolean;
  walletAddress?: string | null;
  balancePendingByVaultId?: Record<string, boolean>;
  fetchingFooterMessage?: string | null;
  userBalances?: Record<string, bigint>;
  onDetailsClick?: (vault: VaultView) => void;
  onDepositClick?: (vault: VaultView) => void;
  onWithdrawClick?: (vault: VaultView) => void;
  emptySubtitle?: string;
}

export function VaultGrid({
  vaults,
  isLoading,
  walletAddress,
  balancePendingByVaultId,
  fetchingFooterMessage,
  userBalances,
  onDetailsClick,
  onDepositClick,
  onWithdrawClick,
  emptySubtitle = "Try adjusting your filters",
}: VaultGridProps) {
  const configuredVaultCount = parseDefindexVaultIds().length;

  if (isLoading && vaults.length === 0) {
    const placeholderSlots = Math.max(configuredVaultCount, 1);
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: placeholderSlots }).map((_, index) => (
          <VaultCardSkeleton key={`vault-list-skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (vaults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-[#1C1C1C] border border-white/5 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
          <Vault className="h-7 w-7 text-white/20" />
        </div>
        <div className="text-center">
          <p className="text-white/50 font-medium mb-1">No vaults found</p>
          <p className="text-white/25 text-sm">{emptySubtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {vaults.map((vault) => {
          const balancePending =
            Boolean(walletAddress) && !!balancePendingByVaultId?.[vault.id];
          if (balancePending) {
            return <VaultCardSkeleton key={vault.id} />;
          }
          return (
            <VaultCard
              key={vault.id}
              vault={vault}
              isLoading={isLoading}
              userBalance={userBalances?.[vault.id]}
              onDetailsClick={onDetailsClick}
              onDepositClick={onDepositClick}
              onWithdrawClick={onWithdrawClick}
            />
          );
        })}
      </div>
      {fetchingFooterMessage ? (
        <div
          className="mt-10 flex justify-center"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-center gap-2 text-sm text-white/50">
            <span
              className="inline-block animate-spin rounded-full border-2 border-white/20 border-t-[#229EDF]"
              style={{ width: 14, height: 14 }}
              aria-hidden
            />
            <span>{fetchingFooterMessage}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
