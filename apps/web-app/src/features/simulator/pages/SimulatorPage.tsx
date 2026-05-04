"use client";

import { PageContainer } from "@/components/ui/PageContainer";
import { SimulatorWizard } from "../components/SimulatorWizard";

export default function SimulatorPage() {
  return (
    <PageContainer maxWidth="5xl" className="flex min-h-0 w-full flex-col py-6">
      <div className="flex h-[calc(100dvh-9rem)] flex-col gap-6 lg:h-[calc(100dvh-4rem)]">
        <header className="shrink-0 flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            Simulator
          </h1>
          <p className="text-sm text-white/60">
            Pick a token and destination, then explore projected
            growth—including yield that already accrues on sovereign bond tokens
            while held.
          </p>
        </header>

        <SimulatorWizard />
      </div>
    </PageContainer>
  );
}
