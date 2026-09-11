"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { SectionCard } from "@/components/ui/SectionCard";

const LEGAL_LINKS = [
  { href: "/privacy", labelKey: "privacyPolicy" },
  { href: "/terms", labelKey: "termsOfService" },
] as const;

export interface SettingsLegalSectionProps {
  open?: boolean;
  onToggle?: () => void;
  icon?: React.ElementType;
}

export function SettingsLegalSection({
  open,
  onToggle,
  icon,
}: SettingsLegalSectionProps) {
  const t = useTranslations("sharedSettings.legal");

  return (
    <SectionCard
      title={t("title")}
      collapsible
      open={open}
      onToggle={onToggle}
      icon={icon}
    >
      <div className="flex flex-col gap-2 pt-1">
        {LEGAL_LINKS.map(({ href, labelKey }) => (
          <Link
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/60 transition-colors duration-150 hover:bg-white/10 hover:text-white/90"
          >
            {t(labelKey)}
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}
