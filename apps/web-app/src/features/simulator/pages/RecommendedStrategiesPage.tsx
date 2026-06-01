"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import { useStrategiesStore } from "@/stores/strategies.store";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";
import { RecommendedStrategyCard } from "../components/ui/RecommendedStrategyCard";
import { StrategiesNavTabs } from "../components/ui/StrategiesNavTabs";
import { useRecommendedStrategies } from "../hooks/useRecommendedStrategies";
import { useToast } from "@/hooks/useToast";
import { TOAST_CONFIG } from "@/lib/constants/toast.config";

export default function RecommendedStrategiesPage() {
  const { strategies, save, setPendingRecommended } = useStrategiesStore();
  const { address } = useStellarWalletStore();
  const router = useRouter();
  const { addNotification } = useToast();
  const { items: recommended, isLoading: recommendedLoading } =
    useRecommendedStrategies();

  const myStrategies = address
    ? strategies.filter((s) => s.walletAddress === address)
    : [];

  const savedRecIds = new Set(
    myStrategies
      .map((s) => s.sourceRecommendationId)
      .filter(Boolean) as string[]
  );

  const handleUseRecommended = (item: (typeof recommended)[number]) => {
    setPendingRecommended({
      token: item.token,
      destination: item.destination,
      stackVenue: item.stackVenue,
      amount: item.dto.amount ?? "",
    });
    router.push("/strategies/new");
  };

  const handleSaveRecommended = (item: (typeof recommended)[number]) => {
    if (!address) {
      addNotification("Connect your wallet", "error", {
        ...TOAST_CONFIG.defaultOpts,
        description: "Connect a wallet to save strategies.",
      });
      return;
    }
    save({
      walletAddress: address,
      name: item.dto.name,
      token: item.token,
      destination: item.destination,
      stackVenue: item.stackVenue,
      amount: item.dto.amount ?? "",
      snapshotApy:
        item.dto.snapshotApy ??
        item.destination.apy ??
        item.stackVenue?.apy ??
        null,
      sourceRecommendationId: item.dto.id,
    });
    addNotification(
      "Saved to your strategies",
      "success",
      TOAST_CONFIG.defaultOpts
    );
  };

  return (
    <PageContainer
      maxWidth="7xl"
      className="flex h-full min-h-0 w-full flex-col"
    >
      <BannerPage
        title="Recommended by Neko"
        subtitle="Curated strategies picked by the Neko team."
        badge="Curated"
        imageSrc="/banners/strategy-builder.svg"
        imageAlt="Recommended strategies"
        className="mb-6 shrink-0 min-h-[128px] sm:min-h-[170px]"
        imageLayoutClassName="right-0 -bottom-10 h-[125%] w-[55%]"
        imageObjectClassName="object-contain object-right object-bottom"
      />

      <StrategiesNavTabs active="recommended" />

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {recommendedLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[260px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
              />
            ))}
          </div>
        ) : recommended.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {recommended.map((item) => (
              <RecommendedStrategyCard
                key={item.dto.id}
                item={item}
                onUse={() => handleUseRecommended(item)}
                onSave={() => handleSaveRecommended(item)}
                isSaved={savedRecIds.has(item.dto.id)}
                canSave={!!address}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-base font-medium text-white/50">
              No curated strategies right now. Check back soon.
            </p>
            <Link
              href="/strategies"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-6 py-2.5 text-sm font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white"
            >
              <ArrowLeft size={14} />
              Back to strategies
            </Link>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
