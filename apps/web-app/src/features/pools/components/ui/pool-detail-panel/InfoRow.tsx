"use client";

import type React from "react";

export function InfoRow({
  label,
  labelEl,
  value,
  valueEl,
  dimmed,
}: {
  label?: string;
  labelEl?: React.ReactNode;
  value?: string;
  valueEl?: React.ReactNode;
  dimmed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      {labelEl ?? <span className="text-white/40 text-xs">{label}</span>}
      {valueEl ?? (
        <span
          className={`text-xs font-medium tabular-nums ${dimmed ? "text-white/40" : "text-white/80"}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}
