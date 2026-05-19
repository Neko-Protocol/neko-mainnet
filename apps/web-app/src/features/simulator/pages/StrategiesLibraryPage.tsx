"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { BannerPage } from "@/components/ui/BannerPage";
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
      maxWidth="5xl"
      className="flex h-full min-h-0 w-full flex-col"
    >
      <BannerPage
        title="Strategies"
        subtitle="Plan your positions. Execute when ready."
        badge="Saved strategies"
        imageSrc="/banners/strategy-builder.svg"
        imageAlt="Strategies"
        className="mb-6 shrink-0 min-h-[128px] sm:min-h-[170px]"
        actions={
          <Link
            href="/strategies/new"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
          >
            <Plus size={13} />
            Build new
          </Link>
        }
      />

      {!address ? (
        <NoWalletState />
      ) : myStrategies.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 [scrollbar-gutter:stable]">
          <div className="grid grid-cols-1 pt-4 gap-5 md:grid-cols-2 lg:grid-cols-3">
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
