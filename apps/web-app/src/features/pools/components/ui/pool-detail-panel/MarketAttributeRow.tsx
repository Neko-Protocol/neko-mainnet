"use client";

import type React from "react";

export function MarketAttributeRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-white/5 last:border-0">
      <span className="text-white/50 text-sm">{label}</span>
      <span className="text-white text-sm font-medium text-right">
        {children}
      </span>
    </div>
  );
}
