"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useDefindexVaults } from "../../hooks/useDefindexVaults";
import { VaultDetailSkeleton } from "../ui/VaultDetailSkeleton";
import { VaultActionPanel } from "../ui/VaultActionPanel";
import { VaultDetailHero } from "../ui/VaultDetailHero";
import { VaultDetailMetrics } from "../ui/VaultDetailMetrics";
import {
  StrategiesSection,
  StrategyAllocationsSection,
} from "../ui/VaultDetailSections";

interface VaultDetailPageProps {
  vaultId: string;
}

export function VaultDetailPage({ vaultId }: VaultDetailPageProps) {
  const { data: defindexPayload, isPending } = useDefindexVaults();
  const vault = useMemo(
    () => (defindexPayload?.vaults ?? []).find((v) => v.id === vaultId) ?? null,
    [defindexPayload, vaultId]
  );

  const { data: apyNum } = useQuery<number | null>({
    queryKey: ["vault-apy", vaultId],
    queryFn: async () => {
      const res = await fetch(`/api/vault/apy?vault=${vaultId}`);
      if (!res.ok) return null;
      const data = (await res.json()) as { vaultApy?: unknown };
      return typeof data.vaultApy === "number" ? data.vaultApy : null;
    },
    enabled: !!vaultId,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const apy =
    apyNum != null && apyNum > 0
      ? `${apyNum.toFixed(2)}%`
      : (vault?.apy7d ?? "—");

  if (isPending || !vault) return <VaultDetailSkeleton />;

  const detail = vault.detail;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 sm:px-6 lg:px-8">
      <div className="shrink-0 py-4">
        <Link
          href="/vaults"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Vaults
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
        <div
          className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl"
          style={{ background: "#111111" }}
        >
          {/* right action panel */}
          <aside
            className="z-30 w-full min-w-0 shrink-0 lg:fixed lg:right-8 lg:top-28 lg:z-40 lg:w-[min(24rem,calc(100vw-4rem))] lg:max-w-[calc(100vw-4rem)] lg:p-0"
            aria-label="Vault actions"
          >
            <div className="pool-detail-scroll flex max-h-[min(calc(100dvh-7rem),calc(100svh-7rem))] flex-col overflow-y-auto overscroll-contain rounded-2xl bg-[#111111] p-6 lg:rounded-xl">
              <VaultActionPanel vault={vault} apy={apy} />
            </div>
          </aside>

          {/* main scrollable content */}
          <section className="vault-detail-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-8 pb-8 pt-0 lg:mr-104 lg:pr-6">
            <div className="pt-8">
              <VaultDetailHero vault={vault} />
              <div className="mb-8 border-t border-white/5" />
              <VaultDetailMetrics vault={vault} apy={apy} />
              <div className="mb-0 mt-10 border-t border-white/5" />
            </div>

            {(vault.description ?? detail?.description) && (
              <section className="mb-8 mt-8">
                <h2 className="mb-3 text-sm font-semibold text-white">
                  Overview
                </h2>
                <p className="text-sm leading-relaxed text-white/50">
                  {detail?.description ?? vault.description}
                </p>
              </section>
            )}

            <StrategiesSection strategies={detail?.strategies ?? []} />
            <StrategyAllocationsSection
              allocations={detail?.strategyAllocations ?? []}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
