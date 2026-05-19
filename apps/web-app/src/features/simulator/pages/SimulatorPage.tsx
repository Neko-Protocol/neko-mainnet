"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BannerPage } from "@/components/ui/BannerPage";
import { PageContainer } from "@/components/ui/PageContainer";
import { SimulatorWizard } from "../components/SimulatorWizard";

export default function SimulatorPage() {
  return (
    <PageContainer
      maxWidth="5xl"
      className="flex h-full min-h-0 w-full flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <BannerPage
          title="Strategy Builder"
          subtitle="Pick a token to see how it can earn, then put it to work."
          badge="Strategies"
          imageSrc="/banners/strategy-builder.svg"
          imageAlt="Strategy builder"
          showImageOnMobile
          imageWrapperClassName="opacity-35 sm:opacity-100"
          className="shrink-0 min-h-[128px] sm:min-h-[240px]"
          actions={
            <Link
              href="/strategies"
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              <ArrowLeft size={13} />
              Strategies
            </Link>
          }
        />

        <SimulatorWizard />
      </div>
    </PageContainer>
  );
}
