"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useSimulatorTokens } from "@/features/simulator/strategies/hooks/useSimulatorTokens";
import { TokenCard } from "@/features/simulator/strategies/components/ui/TokenCard";
import type { SimulatorToken } from "@/features/simulator/strategies/types/simulator.types";

interface TokenSelectorStepProps {
  selected: SimulatorToken | null;
  onSelect: (token: SimulatorToken) => void;
}

export function TokenSelectorStep({
  selected,
  onSelect,
}: TokenSelectorStepProps) {
  const { tokens, isLoading } = useSimulatorTokens();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex shrink-0 flex-col gap-1">
        <h2 className="text-xl font-semibold text-white">
          What are you starting with?
        </h2>
        <p className="text-sm text-white/60">
          Choose a token to start exploring how it can earn for you.
        </p>
      </header>

      {isLoading && tokens.length === 0 ? (
        <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-white/10 bg-[#2A2A2A]">
          <LoadingSpinner />
        </div>
      ) : tokens.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#2A2A2A] p-6 text-center text-sm text-white/60">
          No tokens found. Try again in a moment.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pb-5 pr-1 [scrollbar-gutter:stable]">
          <div className="grid grid-cols-1 pt-4 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {tokens.map((token) => (
              <TokenCard
                key={token.code}
                token={token}
                isSelected={selected?.code === token.code}
                onSelect={() => onSelect(token)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
