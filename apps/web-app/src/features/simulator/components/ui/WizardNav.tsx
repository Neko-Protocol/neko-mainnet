"use client";

import { useHaptics } from "@/hooks/useHaptics";
import { cn } from "@/lib/utils";

interface WizardNavProps {
  onBack?: () => void;
  onContinue?: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
  showBack?: boolean;
  showContinue?: boolean;
  rightSlot?: React.ReactNode;
  className?: string;
}

export function WizardNav({
  onBack,
  onContinue,
  continueDisabled = false,
  continueLabel = "Continue",
  showBack = true,
  showContinue = true,
  rightSlot,
  className,
}: WizardNavProps) {
  const { light } = useHaptics();
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        {showBack && (
          <button
            type="button"
            onClick={() => {
              light();
              onBack?.();
            }}
            className="rounded-full border border-white/10 bg-transparent px-5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/5"
          >
            Back
          </button>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
        {rightSlot}
        {showContinue && (
          <button
            type="button"
            onClick={() => {
              if (!continueDisabled) {
                light();
                onContinue?.();
              }
            }}
            disabled={continueDisabled}
            className={cn(
              "rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-colors",
              continueDisabled
                ? "cursor-not-allowed bg-white/10 text-white/40"
                : "bg-[#229EDF] hover:bg-[#1f8ec9]"
            )}
          >
            {continueLabel}
          </button>
        )}
      </div>
    </div>
  );
}
