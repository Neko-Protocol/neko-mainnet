"use client";

import React from "react";
import { Info } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  tooltip?: React.ReactNode;
}

export function StatCard({
  icon,
  label,
  value,
  isLoading = false,
  className,
  tooltip,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[#1C1C1C] border border-white/5 p-4 sm:p-5 flex flex-col gap-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-white/40 text-xs font-medium">{label}</p>
          {tooltip && (
            <AppTooltip content={tooltip}>
              <button
                type="button"
                aria-label={`More information about ${label}`}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-white/40 hover:text-white/70 transition-colors"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </AppTooltip>
          )}
        </div>
        <div className="p-1.5 bg-[#2A2A2A] rounded-lg text-white/40">
          {icon}
        </div>
      </div>
      <h3 className="text-2xl sm:text-3xl font-bold text-white wrap-break-word">
        {isLoading ? <LoadingSpinner variant="dots" size="md" /> : value}
      </h3>
    </div>
  );
}
