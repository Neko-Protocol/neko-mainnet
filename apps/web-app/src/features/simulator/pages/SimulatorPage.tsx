"use client";

import { PageContainer } from "@/components/ui/PageContainer";
import { SimulatorWizard } from "../components/SimulatorWizard";

export default function SimulatorPage() {
  return (
    <PageContainer
      maxWidth="5xl"
      className="flex h-full min-h-0 w-full flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <SimulatorWizard />
      </div>
    </PageContainer>
  );
}
