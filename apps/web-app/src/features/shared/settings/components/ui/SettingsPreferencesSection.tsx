"use client";

import React from "react";
import { SectionCard } from "@/components/ui/SectionCard";
import { CurrencySelector } from "@/components/navigation/CurrencySelector";

export interface SettingsPreferencesSectionProps {
  open?: boolean;
  onToggle?: () => void;
  icon?: React.ElementType;
}

export function SettingsPreferencesSection({
  open,
  onToggle,
  icon,
}: SettingsPreferencesSectionProps) {
  return (
    <SectionCard
      title="Preferences"
      collapsible
      open={open}
      onToggle={onToggle}
      icon={icon}
    >
      <CurrencySelector embedded />
    </SectionCard>
  );
}
