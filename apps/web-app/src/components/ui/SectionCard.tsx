"use client";

import React from "react";
import { ChevronDown } from "lucide-react";

export interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Overrides the default `text-xs ... text-white/60` title styling. */
  titleClassName?: string;
  icon?: React.ElementType;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}

const DEFAULT_TITLE_CLASSNAME =
  "text-xs font-semibold uppercase tracking-widest text-white/60";

export function SectionCard({
  title,
  children,
  className,
  contentClassName,
  titleClassName = DEFAULT_TITLE_CLASSNAME,
  icon: Icon,
  collapsible = false,
  open = true,
  onToggle,
}: SectionCardProps) {
  const contentId = React.useId();

  if (!collapsible) {
    return (
      <div className={`rounded-[20px] bg-[#1C1C1C] p-5 ${className ?? ""}`}>
        <div className={`flex flex-col gap-3 ${contentClassName ?? ""}`}>
          {children}
        </div>
      </div>
    );
  }

  const headerInner = (
    <>
      <span className={`flex items-center gap-2.5 ${titleClassName}`}>
        {Icon && (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
              open ? "bg-white/10 text-white/80" : "bg-white/5 text-white/40"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        {title}
      </span>
      {onToggle && (
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 ${
            open ? "rotate-180 text-white/70" : ""
          }`}
        />
      )}
    </>
  );

  return (
    <div
      className={`overflow-hidden rounded-[20px] bg-[#1C1C1C] transition-colors ${
        open || !onToggle ? "" : "hover:bg-[#202020]"
      } ${className ?? ""}`}
    >
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          {headerInner}
        </button>
      ) : (
        <div className="flex w-full items-center justify-between gap-3 px-5 py-4">
          {headerInner}
        </div>
      )}
      <div
        id={contentId}
        hidden={!open}
        className={`flex flex-col gap-3 px-5 pb-5 ${contentClassName ?? ""}`}
      >
        {children}
      </div>
    </div>
  );
}
