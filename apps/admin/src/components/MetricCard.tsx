import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function MetricCard(props: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string };
  icon?: ReactNode;
  accent?: "blue" | "subtle" | "white";
}) {
  const { title, value, subtitle, trend, icon, accent = "white" } = props;
  const accentBorder =
    accent === "blue"
      ? "border-neko-border/60"
      : accent === "subtle"
        ? "border-neko-blue/25"
        : "border-admin-border";

  return (
    <div
      className={`relative rounded-xl border bg-admin-surface p-5 ${accentBorder}`}
    >
      <div className="flex justify-between gap-2">
        <p className="font-label text-xs font-medium uppercase tracking-wide text-admin-muted">
          {title}
        </p>
        {icon ? <div className="text-neko-blue">{icon}</div> : null}
      </div>
      <p className="mt-4 break-words text-3xl font-semibold leading-none text-admin-text tabular-nums">
        {value}
      </p>
      {subtitle ? (
        <p className="mt-2 text-xs text-admin-subtle">{subtitle}</p>
      ) : null}
      {trend ? (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium ${
              trend.value >= 0
                ? "bg-neko-blue/15 text-neko-blue"
                : "bg-admin-danger/15 text-admin-danger"
            }`}
          >
            {trend.value >= 0 ? (
              <ArrowUpRight className="size-3.5" aria-hidden />
            ) : (
              <ArrowDownRight className="size-3.5" aria-hidden />
            )}
            {Math.abs(trend.value)}%
          </span>
          <span className="text-admin-subtle">{trend.label}</span>
        </div>
      ) : null}
    </div>
  );
}
