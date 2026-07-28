"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ActiveTab = "saved" | "recommended";

interface StrategiesNavTabsProps {
  active: ActiveTab;
}

const pillBase =
  "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors";

export function StrategiesNavTabs({ active }: StrategiesNavTabsProps) {
  return (
    <div className="mb-6 max-w-md shrink-0">
      <div className="flex w-full rounded-full bg-[#2A2A2A] p-1">
        {active === "saved" ? (
          <span
            className={cn(pillBase, "bg-[#229EDF] font-semibold text-white")}
          >
            Your strategies
          </span>
        ) : (
          <Link
            href="/strategies"
            className={cn(pillBase, "text-white/50 hover:text-white/80")}
          >
            Your strategies
          </Link>
        )}

        {active === "recommended" ? (
          <span
            className={cn(pillBase, "bg-[#229EDF] font-semibold text-white")}
          >
            <Sparkles size={14} className="shrink-0" />
            Recommended
          </span>
        ) : (
          <Link
            href="/strategies/recommended"
            className={cn(pillBase, "text-white/50 hover:text-white/80")}
          >
            <Sparkles size={14} className="shrink-0" />
            Recommended
          </Link>
        )}
      </div>
    </div>
  );
}
