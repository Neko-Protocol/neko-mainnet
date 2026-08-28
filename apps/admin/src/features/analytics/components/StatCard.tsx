import type { ReactNode } from "react";
import { Info } from "lucide-react";

export interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  subValue?: ReactNode;
  isLoading?: boolean;
  info?: string;
}

export function StatCard({
  icon,
  label,
  value,
  subValue,
  isLoading,
  info,
}: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-[#1C1C1C] p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-[#2A2A2A] p-1.5 text-white/40">
          {icon}
        </span>
        <span className="text-xs font-medium text-white/40">{label}</span>
        {info && (
          <div className="group relative ml-auto inline-flex">
            <Info className="h-3.5 w-3.5 cursor-help text-white/25 transition-colors hover:text-white/60" />
            <div className="pointer-events-none absolute right-0 bottom-full z-10 mb-2 w-56 rounded-lg border border-white/10 bg-[#0F0F0F] p-2.5 text-xs leading-relaxed text-white/70 opacity-0 shadow-2xl transition-opacity group-hover:opacity-100">
              {info}
            </div>
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="h-8 w-24 animate-pulse rounded bg-white/10" />
      ) : (
        <div>
          <div className="text-2xl font-bold text-white wrap-break-word sm:text-3xl">
            {value}
          </div>
          {subValue && (
            <div className="mt-1 text-xs text-white/40">{subValue}</div>
          )}
        </div>
      )}
    </div>
  );
}
