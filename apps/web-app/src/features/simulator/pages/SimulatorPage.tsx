"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SimulatorWizard } from "../components/SimulatorWizard";

export default function SimulatorPage() {
  return (
    <PageContainer maxWidth="5xl" className="flex min-h-0 w-full flex-col py-6">
      <div className="flex h-[calc(100dvh-9rem)] flex-col gap-6 lg:h-[calc(100dvh-4rem)]">
        <header className="flex shrink-0 flex-col gap-2">
          <Link
            href="/strategies"
            className="flex w-fit items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
          >
            <ArrowLeft size={14} />
            Strategies
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">
              Strategy Builder
            </h1>
            <p className="text-sm text-white/40">
              Choose a token and a yield destination. Project returns, then save
              or execute.
            </p>
          </div>
        </header>

        <SimulatorWizard />
      </div>
    </PageContainer>
  );
}
