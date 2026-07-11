"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { formatAmount } from "@/lib/helpers/formatUtils";
import { getTokenIcon, getTokenIconFitClass } from "@/lib/helpers/tokenDisplay";
import {
  CLASS_ACCENT,
  getAssetTaxonomy,
} from "@/features/shared/discover/utils/assetClass";
import type { SimulatorToken } from "../../types/simulator.types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface TokenCardProps {
  token: SimulatorToken;
  isSelected: boolean;
  onSelect: () => void;
}

export function TokenCard({ token, isSelected, onSelect }: TokenCardProps) {
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });
  const { price, isLoading: priceLoading } = useTokenPrice(token.code);

  const taxonomy = getAssetTaxonomy(token.code.toUpperCase());
  const accent = taxonomy ? CLASS_ACCENT[taxonomy.class] : null;
  const iconSrc = getTokenIcon(token.code) ?? token.iconSrc;

  const priceLabel =
    priceLoading || price <= 0
      ? ""
      : formatCurrency(convertUsdToSelected(price, fxRate), selectedCurrency);

  const showBalance =
    token.hasWallet && token.balance > 0
      ? `${formatAmount(token.balance)} ${token.code}`
      : null;

  return (
    <button
      type="button"
      onClick={() => {
        onSelect();
      }}
      className={cn(
        "group relative flex h-full min-h-[120px] flex-col overflow-hidden rounded-2xl border bg-[#1C1C1C] p-3.5 text-left transition-all duration-200 sm:min-h-[140px]",
        "hover:-translate-y-0.5 hover:border-white/15 hover:bg-[#202020]",
        isSelected
          ? "border-[#229EDF] ring-1 ring-[#229EDF]/40"
          : "border-white/5"
      )}
      aria-pressed={isSelected}
    >
      <div className="relative mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-sm font-bold text-[#121212] ring-1 ring-white/10">
            {iconSrc ? (
              <Image
                src={iconSrc}
                alt={token.code}
                width={36}
                height={36}
                unoptimized
                className={getTokenIconFitClass(token.code)}
              />
            ) : (
              token.code[0]
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold leading-tight text-white">
              {token.code}
            </h3>
            <p className="mt-0.5 truncate text-[11px] text-white/50">
              {token.name}
            </p>
          </div>
        </div>

        {isSelected ? (
          <span className="shrink-0 rounded-md bg-[#229EDF]/15 px-2 py-0.5 text-[10px] font-semibold text-[#229EDF]">
            Selected
          </span>
        ) : null}
      </div>

      <div className="relative flex flex-1 flex-col justify-between gap-2">
        <div>
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
            Price ({selectedCurrency})
          </p>
          {priceLoading ? (
            <div className="flex min-h-9 items-center gap-2">
              <LoadingSpinner variant="dots" size="sm" />
              <span className="text-xs text-white/40">Loading price...</span>
            </div>
          ) : (
            <p
              className={cn(
                "text-xl font-bold tabular-nums",
                price > 0 ? "text-white" : "text-white/40"
              )}
            >
              {price > 0 ? priceLabel : "No data"}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {taxonomy && accent ? (
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-semibold",
                accent.chip
              )}
            >
              {taxonomy.classLabel}
            </span>
          ) : null}
          {showBalance ? (
            <span className="inline-flex items-center rounded-md bg-white/[0.06] px-2 py-0.5 text-[9px] font-semibold text-white/45">
              {showBalance}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
