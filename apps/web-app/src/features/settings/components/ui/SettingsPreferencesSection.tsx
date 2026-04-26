"use client";

import React from "react";
import { SectionCard } from "@/components/ui/SectionCard";
import { CurrencySelector } from "@/components/navigation/CurrencySelector";

export function SettingsPreferencesSection() {
  return (
    <SectionCard title="Preferences" className="h-full">
      <CurrencySelector embedded />
    </SectionCard>
  );
}
