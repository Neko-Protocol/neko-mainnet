"use client";

import React from "react";

export interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({
  title,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <div className={`rounded-[20px] bg-[#1C1C1C] p-5 ${className ?? ""}`}>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
        {title}
      </h3>
      <div className={`flex flex-col gap-3 ${contentClassName ?? ""}`}>
        {children}
      </div>
    </div>
  );
}
