"use client";

import React, { use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDefindexVaults } from "@/features/shared/vault/hooks/useDefindexVaults";
import { VaultDetailLayout } from "../ui/vault-detail-panel";
import type { VaultActionTab } from "../ui/vault-detail-panel";

interface VaultDetailProps {
  params: Promise<{ vaultid: string }>;
}

function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`rounded-md bg-white/8 ${className}`} aria-hidden />;
}

const PANEL_SCROLL_CLASS =
  "pool-detail-scroll flex max-h-[min(calc(100dvh-7rem),calc(100svh-7rem))] flex-col gap-3 overflow-y-auto overscroll-contain rounded-2xl bg-[#111111] p-6 lg:rounded-xl";

function VaultDetailSkeleton() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 sm:px-6 lg:px-8">
      <div className="shrink-0 py-4">
        <SkeletonBar className="h-5 w-28" />
      </div>

      <div
        className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl"
        style={{ background: "#111111" }}
        aria-busy
        aria-label="Loading vault"
      >
        {/* Right panel skeleton */}
        <aside className="z-30 w-full min-w-0 shrink-0 lg:fixed lg:right-8 lg:top-28 lg:z-40 lg:w-[min(24rem,calc(100vw-4rem))] lg:max-w-[calc(100vw-4rem)] lg:p-0">
          <div className={PANEL_SCROLL_CLASS}>
            <SkeletonBar className="h-11 w-full rounded-xl" />
            <SkeletonBar className="h-30 w-full rounded-xl" />
            <div className="rounded-xl px-4 py-2 space-y-2 mt-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between gap-4 py-2">
                  <SkeletonBar className="h-3 w-20" />
                  <SkeletonBar className="h-3 w-16" />
                </div>
              ))}
            </div>
            <SkeletonBar className="h-12 w-full rounded-xl mt-2" />
          </div>
        </aside>

        {/* Left content skeleton */}
        <section className="pool-detail-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-8 pb-8 pt-0 lg:pr-6 lg:mr-104">
          <div className="pt-8">
            <div className="flex items-center gap-5 mb-10">
              <SkeletonBar className="h-14 w-14 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-3">
                <SkeletonBar className="h-[42px] w-full max-w-[min(100%,32rem)]" />
                <div className="flex flex-wrap gap-4">
                  <SkeletonBar className="h-4 w-32" />
                  <SkeletonBar className="h-4 w-20" />
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 mb-8" />

            <div className="flex flex-wrap justify-between gap-x-8 gap-y-7 mb-10">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-3 min-w-32">
                  <SkeletonBar className="h-3 w-16" />
                  <SkeletonBar className="h-9 w-28" />
                </div>
              ))}
            </div>

            <div className="border-t border-white/5 mb-8" />

            <div className="space-y-4">
              <SkeletonBar className="h-5 w-32" />
              <SkeletonBar className="h-4 w-full max-w-lg" />
              <SkeletonBar className="h-4 w-full max-w-md" />
              <SkeletonBar className="h-4 w-48 mt-6" />
              <div className="space-y-0 rounded-xl border border-white/5 overflow-hidden mt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between gap-4 py-3.5 px-1 border-b border-white/5 last:border-0">
                    <SkeletonBar className="h-4 w-28" />
                    <SkeletonBar className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const VaultDetail: React.FC<VaultDetailProps> = ({ params }) => {
  const { vaultid: rawId } = use(params);
  const vaultId = decodeURIComponent(rawId);

  const searchParams = useSearchParams();
  const initialTab: VaultActionTab =
    searchParams?.get("tab") === "withdraw" ? "withdraw" : "deposit";

  const { data: payload, isPending } = useDefindexVaults();
  const vault = payload?.vaults?.find((v) => v.id === vaultId) ?? null;

  if (isPending) {
    return <VaultDetailSkeleton />;
  }

  if (!vault) {
    return (
      <div className="w-full flex items-center justify-center px-4 py-8 h-dvh">
        <div className="max-w-2xl w-full rounded-2xl bg-red-500/10 border border-red-500/20 p-8 text-center">
          <h1 className="text-xl font-bold text-red-400 mb-2">
            Vault not found
          </h1>
          <p className="text-red-400/70 text-sm mb-6">
            Could not load vault data. The vault ID may be invalid or the API
            may be unavailable.
          </p>
          <Link
            href="/vaults"
            className="text-[#229EDF] font-semibold text-sm hover:underline"
          >
            &larr; Back to Vaults
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 sm:px-6 lg:px-8">
      <div className="shrink-0 py-4">
        <Link
          href="/vaults"
          className="inline-flex items-center gap-1 text-white/60 hover:text-white font-medium text-sm transition-colors"
        >
          &larr; Back to Vaults
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
        <VaultDetailLayout vault={vault} initialTab={initialTab} />
      </div>
    </div>
  );
};

export default VaultDetail;
