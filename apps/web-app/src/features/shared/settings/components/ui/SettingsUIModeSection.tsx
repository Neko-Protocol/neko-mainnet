"use client";

import React from "react";
import { BarChart3, Compass } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { useUIModeStore, type UIMode } from "@/stores/ui-mode.store";

const MODES: {
  id: UIMode;
  label: string;
  description: string;
  Icon: React.ElementType;
  activeRing: string;
  activeIcon: string;
  activeBg: string;
}[] = [
  {
    id: "expert",
    label: "Expert App",
    description: "Full data, advanced metrics, and all protocol features.",
    Icon: BarChart3,
    activeRing: "border-violet-500/40",
    activeIcon: "text-violet-400",
    activeBg: "bg-violet-500/15",
  },
  {
    id: "basic",
    label: "Basic App",
    description: "Simple language, guided experience, and hidden complexity.",
    Icon: Compass,
    activeRing: "border-emerald-500/40",
    activeIcon: "text-emerald-400",
    activeBg: "bg-emerald-500/15",
  },
];

export function SettingsUIModeSection() {
  const mode = useUIModeStore((s) => s.mode);
  const setMode = useUIModeStore((s) => s.setMode);

  return (
    <SectionCard title="App Mode">
      <div className="space-y-2">
        {MODES.map(
          ({
            id,
            label,
            description,
            Icon,
            activeRing,
            activeIcon,
            activeBg,
          }) => {
            const isActive = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-150 ${
                  isActive
                    ? `${activeRing} bg-white/5`
                    : "border-white/5 bg-[#2A2A2A] hover:bg-[#333]"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isActive ? activeBg : "bg-white/5"}`}
                >
                  <Icon
                    className={`h-4 w-4 ${isActive ? activeIcon : "text-white/30"}`}
                  />
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold ${isActive ? "text-white" : "text-white/50"}`}
                  >
                    {label}
                  </p>
                  <p className="mt-0.5 text-xs text-white/30">{description}</p>
                </div>
                {isActive && (
                  <span className="mt-1 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                    Active
                  </span>
                )}
              </button>
            );
          }
        )}
      </div>
    </SectionCard>
  );
}
