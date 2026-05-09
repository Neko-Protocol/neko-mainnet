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

export function StepIndicator({ steps, currentPhase }: StepIndicatorProps) {
  const activeIdx = Math.max(
    0,
    steps.findIndex((s) => s.phase === currentPhase)
  );

  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
      {steps.map((step, idx) => {
        const isActive = step.phase === currentPhase;
        const isDone = idx < activeIdx;
        const displayNum = idx + 1;
        return (
          <li key={step.phase} className="flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors",
                isActive && "bg-[#229EDF] text-white",
                isDone && "bg-[#229EDF]/15 text-[#229EDF]",
                !isActive && !isDone && "bg-white/5 text-white/50"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                  isActive && "bg-white/20 text-white",
                  isDone && "bg-[#229EDF]/30 text-[#229EDF]",
                  !isActive && !isDone && "bg-white/10 text-white/50"
                )}
              >
                {displayNum}
              </span>
              <span className="font-medium">{step.label}</span>
            </span>
            {idx < steps.length - 1 && (
              <span
                className={cn(
                  "h-px w-4 sm:w-8",
                  idx < activeIdx ? "bg-[#229EDF]/40" : "bg-white/10"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
