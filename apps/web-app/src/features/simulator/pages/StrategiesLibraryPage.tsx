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
        imageLayoutClassName="right-0 -bottom-10 h-[125%] w-[55%]"
        imageObjectClassName="object-contain object-right object-bottom"
      />

      {!address ? (
        <NoWalletState />
      ) : myStrategies.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex shrink-0 items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/40">
              Your strategies · {myStrategies.length} saved
            </p>
            <Link
              href="/strategies/new"
              className="group/cta inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#2BA9E5] to-[#1a8ac9] px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/15 transition-all hover:from-[#3AB4EA] hover:to-[#229EDF] active:scale-[0.98]"
            >
              <Plus
                size={14}
                className="transition-transform group-hover/cta:rotate-90"
              />
              Build new strategy
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 [scrollbar-gutter:stable] pt-4">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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
