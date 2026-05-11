"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useFxRate } from "@/hooks/useFxRate";
import { useCurrencyStore } from "@/stores/currency.store";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { formatAmount } from "@/lib/helpers/formatUtils";
import { getTokenIconFitClass } from "@/lib/helpers/tokenUtils";
import { getAssetTaxonomy } from "@/features/shared/discover/utils/assetClass";
import type { SimulatorToken } from "../../types/simulator.types";
import { Info } from "lucide-react";
import { AppTooltip } from "@/components/ui/AppTooltip";

interface TokenCardProps {
  token: SimulatorToken;
  isSelected: boolean;
  onSelect: () => void;
}

const TOKEN_DESCRIPTIONS: Record<string, string> = {
  XLM: "The native currency of the Stellar network, used for transaction fees and basic operations.",
  EURC: "Euro-pegged stablecoin issued by Circle. 1 EURC is always redeemable for 1 euro.",
  USDC: "US dollar stablecoin issued by Circle. 1 USDC is always redeemable for 1 US dollar.",
  PYUSD:
    "US dollar stablecoin issued by PayPal, backed 1:1 by US dollar reserves.",
  USDY: "Yield-bearing US dollar token by Ondo Finance. Earns daily interest from short-term US Treasuries.",
  USDGLO:
    "US dollar stablecoin by the Glo Foundation. Its reserves fund public goods and charities.",
  CETES:
    "Mexican government treasury certificates tokenized by Etherfuse. Earns yield in Mexican pesos.",
  USTRY:
    "US Treasury bond token by Etherfuse. Backed by US government securities, earns yield in USD.",
  TESOURO:
    "Brazilian government bond tokenized by Etherfuse. Earns yield denominated in Brazilian reais.",
  KTB: "South Korean government bond tokenized by Etherfuse. Earns yield denominated in Korean won.",
};

export function TokenCard({ token, isSelected, onSelect }: TokenCardProps) {
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });
  const { price, isLoading: priceLoading } = useTokenPrice(token.code);

  const taxonomy = getAssetTaxonomy(token.code.toUpperCase());
  const sameNameAndCode = token.name.toUpperCase() === token.code.toUpperCase();

  const priceLabel =
    priceLoading || price <= 0
      ? ""
      : formatCurrency(convertUsdToSelected(price, fxRate), selectedCurrency);

  const showBalance =
    token.hasWallet && token.balance > 0
      ? `${formatAmount(token.balance)} ${token.code}`
      : null;

  const showPriceRow = priceLoading || price > 0;

  const chipClass =
    taxonomy?.class === "stablecoin"
      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
      : taxonomy?.class === "sovereign-bond"
        ? "bg-blue-500/10 text-blue-300 border border-blue-500/15"
        : token.code.toUpperCase() === "XLM"
          ? "bg-white/8 text-white/50 border border-white/10"
          : null;

  const chipLabel =
    taxonomy?.class === "stablecoin"
      ? "Stablecoin"
      : taxonomy?.class === "sovereign-bond"
        ? "Gov Bond"
        : token.code.toUpperCase() === "XLM"
          ? "Native"
          : null;

  const description = TOKEN_DESCRIPTIONS[token.code.toUpperCase()] ?? null;

  const showPriceOrBalanceFooter = showPriceRow || !!showBalance;

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
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full shadow-md">
          {token.iconSrc ? (
            <Image
              src={token.iconSrc}
              alt={token.code}
              width={44}
              height={44}
              unoptimized
              className={getTokenIconFitClass(token.code)}
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#229EDF]/30 text-sm font-bold text-white">
              {token.code[0]}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          {sameNameAndCode ? (
            <p className="truncate text-sm font-semibold text-white">
              {token.code}
            </p>
          ) : (
            <>
              <p className="truncate text-sm font-semibold text-white">
                {token.name}
              </p>
              <p className="text-xs text-white/50">{token.code}</p>
            </>
          )}
          {chipClass && chipLabel ? (
            <span
              className={cn(
                "inline-block text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5",
                chipClass
              )}
            >
              {chipLabel}
            </span>
          ) : null}
        </div>
        {description ? (
          <AppTooltip content={description} widthClassName="w-60">
            <span className="shrink-0 text-white/25 transition-colors hover:text-white/60">
              <Info size={14} />
            </span>
          </AppTooltip>
        ) : null}
      </div>

      {showPriceOrBalanceFooter ? (
        <div className="flex flex-col gap-0.5">
          {showPriceRow ? (
            <span className="text-xs text-white/50">{priceLabel}</span>
          ) : null}
          {showBalance ? (
            <span className="text-xs text-white/70">{showBalance}</span>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}
