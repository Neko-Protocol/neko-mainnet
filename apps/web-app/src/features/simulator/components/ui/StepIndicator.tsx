"use client";

import { cn } from "@/lib/utils";
import type { WizardPhaseId } from "../../types/simulator.types";

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
        strokeWidth="1.75"
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

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between sm:hidden">
        <span className="text-xs font-semibold text-white/60">
          Step {activeIdx + 1} of {steps.length}
        </span>
        <span className="text-xs font-medium text-white">
          {steps[activeIdx]?.label}
        </span>
      </div>
      <ol className="hidden sm:flex flex-wrap items-center gap-2 text-xs sm:text-sm">
        {steps.map((step, idx) => {
          const isActive = step.phase === currentPhase;
          const isDone = idx < activeIdx;
          const displayNum = idx + 1;
          const isConnectorCompleted = idx + 1 < activeIdx;

          return (
            <li key={step.phase} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  isActive && "rounded-full bg-[#229EDF] px-3 py-1.5 text-white"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                    isActive && "bg-white/20 text-white",
                    isDone && "bg-[#229EDF] text-white",
                    !isActive && !isDone && "bg-white/8 text-white/25"
                  )}
                >
                  {isDone ? <CheckIcon className="h-2.5 w-2.5" /> : displayNum}
                </span>
                <span
                  className={cn(
                    "font-medium",
                    isActive && "text-white",
                    isDone && "text-[#229EDF]",
                    !isActive && !isDone && "text-white/30"
                  )}
                >
                  {step.label}
                </span>
              </span>
              {idx < steps.length - 1 && (
                <span
                  className={cn(
                    "h-px w-4 sm:w-8",
                    isConnectorCompleted ? "bg-[#229EDF]/50" : "bg-white/10"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
