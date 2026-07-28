"use client";

import { cn } from "@/lib/utils";
import type { WizardPhaseId } from "@/features/simulator/strategies/types/simulator.types";

export interface WizardStepMeta {
  phase: WizardPhaseId;
  label: string;
}

interface StepIndicatorProps {
  steps: WizardStepMeta[];
  currentPhase: WizardPhaseId;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M2.5 6L5 8.5L9.5 3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StepIndicator({ steps, currentPhase }: StepIndicatorProps) {
  const activeIdx = Math.max(
    0,
    steps.findIndex((s) => s.phase === currentPhase)
  );

  const progressPct =
    steps.length > 1 ? (activeIdx / (steps.length - 1)) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-3 sm:px-4">
      {/* Mobile: compact progress bar */}
      <div className="flex flex-col gap-2 sm:hidden">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
            Step {activeIdx + 1} of {steps.length}
          </span>
          <span className="text-xs font-semibold text-white">
            {steps[activeIdx]?.label}
          </span>
        </div>
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#229EDF] to-[#5BB8E8] transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Desktop: numbered steps with continuous progress track */}
      <ol className="relative hidden sm:flex items-start justify-between px-1">
        {/* Track background */}
        <div className="pointer-events-none absolute left-[22px] right-[22px] top-[18px] h-[2px] -translate-y-1/2 rounded-full bg-white/[0.06]" />
        {/* Track progress */}
        <div
          className="pointer-events-none absolute left-[22px] top-[18px] h-[2px] -translate-y-1/2 rounded-full bg-gradient-to-r from-[#229EDF] to-[#5BB8E8] transition-all duration-500 ease-out"
          style={{
            width: `calc((100% - 44px) * ${activeIdx} / ${Math.max(
              1,
              steps.length - 1
            )})`,
          }}
        />
        {steps.map((step, idx) => {
          const isActive = step.phase === currentPhase;
          const isDone = idx < activeIdx;

          return (
            <li
              key={step.phase}
              className="relative z-10 flex flex-col items-center gap-2.5"
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                  isDone && "bg-[#229EDF] text-white",
                  isActive &&
                    "bg-[#229EDF] text-white ring-2 ring-[#229EDF]/30 scale-105",
                  !isActive &&
                    !isDone &&
                    "border border-white/10 bg-[#161616] text-white/35"
                )}
              >
                {isDone ? <CheckIcon className="h-3.5 w-3.5" /> : idx + 1}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-xs font-medium tracking-tight transition-colors",
                  isActive && "text-white",
                  isDone && "text-white/70",
                  !isActive && !isDone && "text-white/35"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
