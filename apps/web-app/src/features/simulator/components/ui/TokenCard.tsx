"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { formatAmount } from "@/lib/helpers/formatUtils";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import type { SimulatorToken } from "../../types/simulator.types";

interface TokenCardProps {
  token: SimulatorToken;
  isSelected: boolean;
  onSelect: () => void;
}

export function TokenCard({ token, isSelected, onSelect }: TokenCardProps) {
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });
  const { price, isLoading: priceLoading } = useTokenPrice(token.code);

  const priceLabel =
    priceLoading || price <= 0
      ? "—"
      : `About ${formatCurrency(
          convertUsdToSelected(price, fxRate),
          selectedCurrency
        )}`;

  const balanceLabel = token.hasWallet
    ? token.balance > 0
      ? `You have ${formatAmount(token.balance)} ${token.code}`
      : `0 ${token.code} in your wallet`
    : "Connect wallet to see your balance";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border bg-[#2A2A2A] p-4 text-left transition-all",
        "hover:border-white/20 hover:bg-[#2F2F2F]",
        isSelected
          ? "border-[#229EDF] ring-1 ring-[#229EDF]/40"
          : "border-white/10"
      )}
      aria-pressed={isSelected}
    >
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full shadow-md">
          {token.iconSrc ? (
            <Image
              src={token.iconSrc}
              alt={token.code}
              width={40}
              height={40}
              unoptimized
              className={getTokenIconFitClass(token.code)}
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#229EDF]/30 text-sm font-bold text-white">
              {token.code[0]}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {token.name}
          </p>
          <p className="text-xs text-white/50">{token.code}</p>
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-white/50">{priceLabel}</span>
        <span
          className={cn(
            "text-xs",
            token.hasWallet ? "text-white/70" : "text-white/40"
          )}
        >
          {balanceLabel}
        </span>
      </div>
    </button>
  );
}
