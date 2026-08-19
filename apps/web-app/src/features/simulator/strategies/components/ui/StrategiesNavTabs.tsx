"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ActiveTab = "saved" | "recommended";

interface StrategiesNavTabsProps {
  active: ActiveTab;
}

const pillBase =
  "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors";

export function StrategiesNavTabs({ active }: StrategiesNavTabsProps) {
  const t = useTranslations("simulator.navTabs");
  return (
    <div className="mb-6 max-w-md shrink-0">
      <div className="flex w-full rounded-full bg-[#2A2A2A] p-1">
        {active === "saved" ? (
          <span
            className={cn(pillBase, "bg-[#229EDF] font-semibold text-white")}
          >
            {t("yourStrategies")}
          </span>
        ) : (
          <Link
            href="/strategies"
            className={cn(pillBase, "text-white/50 hover:text-white/80")}
          >
            {t("yourStrategies")}
          </Link>
        )}

        {active === "recommended" ? (
          <span
            className={cn(pillBase, "bg-[#229EDF] font-semibold text-white")}
          >
            <Sparkles size={14} className="shrink-0" />
            {t("recommended")}
          </span>
        ) : (
          <Link
            href="/strategies/recommended"
            className={cn(pillBase, "text-white/50 hover:text-white/80")}
          >
            <Sparkles size={14} className="shrink-0" />
            {t("recommended")}
          </Link>
        )}
      </div>
    </div>
  );
}
