"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import {
  useStrategiesStore,
  type SavedStrategy,
} from "@/stores/strategies.store";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";
import { StrategyRow } from "../components/ui/StrategyRow";

export default function StrategiesLibraryPage() {
  const { strategies, remove, setPendingExecuteId } = useStrategiesStore();
  const { address } = useStellarWalletStore();
  const router = useRouter();

  const myStrategies = address
    ? strategies.filter((s) => s.walletAddress === address)
    : [];

  const handleExecute = (strategy: SavedStrategy) => {
    setPendingExecuteId(strategy.id);
    router.push("/strategies/new");
  };

  return (
    <PageContainer
      maxWidth="7xl"
      className="flex h-full min-h-0 w-full flex-col"
    >
      <div className="mb-6 flex shrink-0 items-start justify-between gap-4">
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

      {!address ? (
        <NoWalletState />
      ) : myStrategies.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
          <div className="grid grid-cols-1 gap-5 pb-1 md:grid-cols-2 xl:grid-cols-3">
            {myStrategies.map((s) => (
              <StrategyRow
                key={s.id}
                strategy={s}
                onExecute={() => handleExecute(s)}
                onDelete={() => remove(s.id, address)}
              />
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function NoWalletState() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
      <p className="text-base font-medium text-white/50">
        Connect your wallet to see your strategies
      </p>
      <p className="text-sm text-white/25">
        Strategies are saved per wallet address.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 text-center">
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
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-6 py-2.5 text-sm font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white"
      >
        <Plus size={14} />
        Build your first strategy
      </Link>
    </div>
  );
}
