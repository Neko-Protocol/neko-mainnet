"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useSimulatorTokens } from "../hooks/useSimulatorTokens";
import { TokenCard } from "./ui/TokenCard";
import type { SimulatorToken } from "../types/simulator.types";

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
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-white">
          Which token do you want to simulate?
        </h2>
        <p className="text-sm text-white/60">
          Pick a token. We&apos;ll show pools, vaults, and yield-bearing bond
          options when they apply.
        </p>
      </header>

      {isLoading && tokens.length === 0 ? (
        <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-white/10 bg-[#2A2A2A]">
          <LoadingSpinner />
        </div>
      ) : tokens.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#2A2A2A] p-6 text-center text-sm text-white/60">
          No tokens available yet. Try again in a moment.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tokens.map((token) => (
            <TokenCard
              key={token.code}
              token={token}
              isSelected={selected?.code === token.code}
              onSelect={() => onSelect(token)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
