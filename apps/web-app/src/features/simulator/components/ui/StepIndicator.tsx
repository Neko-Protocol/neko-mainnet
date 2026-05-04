"use client";

import { cn } from "@/lib/utils";
import type { WizardStep } from "../../types/simulator.types";

interface StepIndicatorProps {
  current: WizardStep;
}

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: "Pick a token" },
  { id: 2, label: "Pick a destination" },
  { id: 3, label: "See projections" },
];

export function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
      {STEPS.map((step, idx) => {
        const isActive = step.id === current;
        const isDone = step.id < current;
        return (
          <li key={step.id} className="flex items-center gap-2">
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
                {step.id}
              </span>
              <span className="font-medium">{step.label}</span>
            </span>
            {idx < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px w-4 sm:w-8",
                  step.id < current ? "bg-[#229EDF]/40" : "bg-white/10"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
