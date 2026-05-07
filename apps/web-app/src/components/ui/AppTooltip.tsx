"use client";

import React from "react";

interface AppTooltipProps {
  content: React.ReactNode;
  widthClassName?: string;
  children: React.ReactElement;
}

export function AppTooltip({
  content,
  widthClassName = "w-48",
  children,
}: AppTooltipProps) {
  return (
    <span className="group relative inline-flex">
      {children}
      <div
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 rounded-lg bg-[#2A2A2A] px-2 py-1 text-[10px] leading-relaxed text-white/70 shadow-xl group-hover:block group-focus-within:block ${widthClassName}`}
      >
        {content}
      </div>
    </span>
  );
}
