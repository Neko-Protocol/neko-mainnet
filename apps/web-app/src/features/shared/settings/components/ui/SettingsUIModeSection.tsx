"use client";

import React from "react";
import { Check } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { useUIModeStore, type UIMode } from "@/stores/ui-mode.store";

const MODES: { id: UIMode; label: string; description: string }[] = [
  {
    id: "expert",
    label: "Expert App",
    description: "Full data, advanced metrics, and all protocol features.",
  },
  {
    id: "basic",
    label: "Basic App",
    description: "Simple language, guided experience, and hidden complexity.",
  },
];

export interface SettingsUIModeSectionProps {
  open?: boolean;
  onToggle?: () => void;
  icon?: React.ElementType;
}

export function SettingsUIModeSection({
  open,
  onToggle,
  icon,
}: SettingsUIModeSectionProps) {
  const mode = useUIModeStore((s) => s.mode);
  const setMode = useUIModeStore((s) => s.setMode);

  return (
    <SectionCard
      title="App Mode"
      collapsible
      open={open}
      onToggle={onToggle}
      icon={icon}
    >
      <div
        role="radiogroup"
        aria-label="App mode"
        className="flex flex-col gap-2 pt-1"
      >
        {MODES.map(({ id, label, description }) => {
          const isActive = mode === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setMode(id)}
              className={`group flex w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left transition-colors duration-150 ${
                isActive
                  ? "border-[#229EDF]"
                  : "border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03]"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  isActive
                    ? "border-[#229EDF] text-[#229EDF]"
                    : "border-white/25 bg-transparent"
                }`}
              >
                {isActive ? (
                  <Check
                    className="h-2.5 w-2.5 text-[#229EDF]"
                    strokeWidth={3.5}
                  />
                ) : null}
              </span>

              <span className="flex flex-1 flex-col gap-0.5">
                <span
                  className={`text-sm font-semibold tracking-tight ${
                    isActive ? "text-white" : "text-white/85"
                  }`}
                >
                  {label}
                </span>
                <span className="text-xs leading-relaxed text-white/45">
                  {description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}
