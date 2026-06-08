"use client";

import React from "react";

interface AppTooltipProps {
  content: React.ReactNode;
  widthClassName?: string;
  position?: "top" | "bottom";
  children: React.ReactElement;
}

export function AppTooltip({
  content,
  widthClassName = "w-48",
  position = "bottom",
  children,
}: AppTooltipProps) {
  const positionClass =
    position === "top" ? "bottom-full mb-1" : "top-full mt-1";

  return (
    <span className="group relative inline-flex">
      {children}
      <div
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-50 hidden -translate-x-1/2 rounded-lg bg-[#2A2A2A] px-2 py-1 text-[10px] leading-relaxed text-white/70 shadow-xl group-hover:block group-focus-within:block ${positionClass} ${widthClassName}`}
      >
        {content}
      </div>
    </span>
  );
}
