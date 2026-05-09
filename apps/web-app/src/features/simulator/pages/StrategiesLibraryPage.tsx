"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import {
  useStrategiesStore,
  type SavedStrategy,
} from "@/stores/strategies.store";
import { StrategyRow } from "../components/ui/StrategyRow";

export default function StrategiesLibraryPage() {
  const { strategies, remove, setPendingExecuteId } = useStrategiesStore();
  const router = useRouter();

  const handleExecute = (strategy: SavedStrategy) => {
    setPendingExecuteId(strategy.id);
    router.push("/strategies/new");
  };

  return (
    <PageContainer maxWidth="3xl" className="py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            Strategies
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Plan your positions. Execute when ready.
          </p>
        </div>

        <Link
          href="/strategies/new"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#229EDF] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1f8ec9]"
        >
          <Plus size={15} />
          Build new
        </Link>
      </div>

      {strategies.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-2.5">
          {strategies.map((s) => (
            <StrategyRow
              key={s.id}
              strategy={s}
              onExecute={() => handleExecute(s)}
              onDelete={() => remove(s.id)}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-5 py-24 text-center">
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium text-white/50">
          No saved strategies
        </p>
        <p className="text-sm text-white/25">
          Build one to plan a yield position before committing funds.
        </p>
      </div>
      <Link
        href="/strategies/new"
        className="rounded-full border border-white/15 px-6 py-2.5 text-sm font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white"
      >
        Build your first strategy →
      </Link>
    </div>
  );
}
