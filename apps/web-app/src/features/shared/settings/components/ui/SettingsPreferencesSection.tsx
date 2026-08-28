"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { SectionCard } from "@/components/ui/SectionCard";
import { CurrencySelector } from "@/components/navigation/CurrencySelector";
import { LanguageSelector } from "@/components/navigation/LanguageSelector";

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
  const t = useTranslations("sharedSettings.preferences");
  return (
    <SectionCard
      title={t("title")}
      collapsible
      open={open}
      onToggle={onToggle}
      icon={icon}
    >
      <div className="flex flex-col gap-3">
        <CurrencySelector embedded />
        <LanguageSelector embedded />
      </div>
    </SectionCard>
  );
}
