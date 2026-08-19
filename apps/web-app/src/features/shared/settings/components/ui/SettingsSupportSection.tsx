"use client";

import React from "react";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { SectionCard } from "@/components/ui/SectionCard";

const SUPPORT_EMAIL = "fabian@oppialabs.com";

export interface SettingsSupportSectionProps {
  open?: boolean;
  onToggle?: () => void;
  icon?: React.ElementType;
}

export function SettingsSupportSection({
  open,
  onToggle,
  icon,
}: SettingsSupportSectionProps) {
  const t = useTranslations("sharedSettings.support");

  return (
    <SectionCard
      title={t("title")}
      collapsible
      open={open}
      onToggle={onToggle}
      icon={icon}
    >
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm leading-relaxed text-white/60">{t("notice")}</p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-neko-muted transition-colors hover:text-neko-teal-light"
        >
          <Mail className="h-4 w-4" />
          {SUPPORT_EMAIL}
        </a>
      </div>
    </SectionCard>
  );
}
