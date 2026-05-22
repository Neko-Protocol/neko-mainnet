import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function MetricCard(props: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string };
  icon?: ReactNode;
  accent?: "blue" | "green" | "white";
}) {
  const { title, value, subtitle, trend, icon, accent = "white" } = props;
  const accentRing =
    accent === "blue"
      ? "ring-1 ring-[#229EDF]/30"
      : accent === "green"
        ? "ring-1 ring-[#4ADE80]/30"
        : "ring-1 ring-white/5";

  return (
    <div
      className={`relative rounded-2xl border border-white/8 bg-[#1C1C1C] p-5 ${accentRing}`}
    >
      <div className="flex justify-between gap-2">
        <p className="text-sm font-medium text-white/50">{title}</p>
        {icon ? <div className="text-white/40">{icon}</div> : null}
      </div>
      <p className="mt-2 break-words text-3xl font-bold leading-tight text-white">
        {value}
      </p>
      {subtitle ? (
        <p className="mt-1 text-xs text-white/45">{subtitle}</p>
      ) : null}
      {trend ? (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium ${
              trend.value >= 0
                ? "bg-emerald-500/15 text-[#4ADE80]"
                : "bg-red-500/15 text-red-400"
            }`}
          >
            {trend.value >= 0 ? (
              <ArrowUpRight className="size-3.5" aria-hidden />
            ) : (
              <ArrowDownRight className="size-3.5" aria-hidden />
            )}
            {Math.abs(trend.value)}%
          </span>
          <span className="text-white/40">{trend.label}</span>
        </div>
      ) : null}
    </div>
  );
}
