import React from "react";
import {
  Info,
  AlertTriangle,
  Droplet,
  DollarSign,
  TrendingDown,
} from "lucide-react";
import { AppTooltip } from "@/components/ui/AppTooltip";

interface SwapValueAnalysis {
  expectedOutput: number;
  actualOutput: number;
  differencePercent: number;
  isSuspiciouslyLow: boolean;
}

interface SwapValueWarningProps {
  analysis: SwapValueAnalysis;
  isLoadingPrice: boolean;
}

export const SwapValueWarning: React.FC<SwapValueWarningProps> = ({
  analysis,
  isLoadingPrice,
}) => {
  if (!analysis.isSuspiciouslyLow || isLoadingPrice) {
    return null;
  }

  const tooltipContent = (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="h-3 w-3 text-amber-400" />
        <p className="font-semibold text-white text-[10px]">
          Why is the value low?
        </p>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-start gap-1.5">
          <Droplet className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-blue-400 font-semibold">
              Limited Liquidity:
            </span>{" "}
            There may be low liquidity in this pair
          </div>
        </div>
        <div className="flex items-start gap-1.5">
          <DollarSign className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-amber-400 font-semibold">Protocol Fees:</span>{" "}
            Commissions reduce the amount received
          </div>
        </div>
      </div>
      {analysis.differencePercent > 0 && (
        <div className="pt-2 mt-2 border-t border-white/10 flex items-center gap-1.5">
          <TrendingDown className="h-3 w-3 text-red-400" />
          <p>
            Expected difference:{" "}
            <span className="text-red-400 font-semibold">
              ~{analysis.differencePercent.toFixed(4)}%
            </span>
          </p>
        </div>
      )}
    </div>
  );

  return (
    <AppTooltip content={tooltipContent} widthClassName="w-64">
      <button
        type="button"
        aria-label="Why is the value low?"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 transition-colors"
      >
        <Info className="h-4 w-4" />
      </button>
    </AppTooltip>
  );
};
