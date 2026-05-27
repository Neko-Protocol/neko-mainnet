"use client";

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
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse items-stretch gap-3 px-2 pb-10 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        {showBack && (
          <button
            type="button"
            onClick={() => {
              onBack?.();
            }}
            className="rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
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
                onContinue?.();
              }
            }}
            disabled={continueDisabled}
            className={cn(
              "rounded-full px-7 py-3 text-sm font-semibold transition-all",
              continueDisabled
                ? "cursor-not-allowed bg-white/[0.06] text-white/30"
                : "bg-[#229EDF] text-white shadow-[0_4px_20px_rgba(34,158,223,0.3)] hover:bg-[#1a8ac9] hover:shadow-[0_4px_25px_rgba(34,158,223,0.45)] active:scale-[0.98]"
            )}
          >
            {continueLabel}
          </button>
        )}
      </div>
    </div>
  );
}
