"use client";

import React, { useState } from "react";
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

function ConfirmModeDialog({
  targetMode,
  onConfirm,
  onCancel,
}: {
  targetMode: UIMode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const target = MODES.find((m) => m.id === targetMode)!;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in-0 duration-200"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
        style={{ background: "#161616" }}
      >
        <p className="text-white font-semibold text-base mb-1">
          Change app mode?
        </p>
        <p className="text-white/50 text-sm leading-relaxed mb-6">
          You&apos;re switching to{" "}
          <span className="text-white font-medium">{target.label}</span>.{" "}
          {target.description}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/60 bg-white/6 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#229EDF] hover:bg-[#1a8bc7] transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [pending, setPending] = useState<UIMode | null>(null);

  function handleSelect(id: UIMode) {
    if (id === mode) return;
    setPending(id);
  }

  function handleConfirm() {
    if (pending) setMode(pending);
    setPending(null);
  }

  return (
    <>
      {pending && (
        <ConfirmModeDialog
          targetMode={pending}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}

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
                onClick={() => handleSelect(id)}
                className={`group flex w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left transition-colors duration-150 ${
                  isActive
                    ? "border-[#229EDF]"
                    : "border-white/6 bg-white/1.5 hover:bg-white/3"
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
    </>
  );
}
