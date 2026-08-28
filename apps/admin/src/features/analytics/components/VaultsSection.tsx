"use client";

import { useVaultDepositors } from "../hooks/useVaultDepositors";
import { AnalyticsErrorState } from "./AnalyticsErrorState";
import { VaultCard } from "./VaultCard";

export function VaultsSection() {
  const { data, isPending, isError } = useVaultDepositors();
  const groups = data ?? [];

  return (
    <section>
      <h2 className="mb-3 text-xl font-bold text-white">Vaults</h2>
      {isError ? (
        <AnalyticsErrorState />
      ) : isPending ? (
        <div className="rounded-2xl border border-white/5 bg-[#1C1C1C] p-5 text-sm text-white/40">
          Loading vaults…
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <VaultCard key={group.vaultId} group={group} />
          ))}
        </div>
      )}
    </section>
  );
}
