import { APP_DISPLAY_DECIMALS } from "@/lib/constants/display";
import type { SupportedCurrency } from "@/stores/currency.store";

export function convertUsdToSelected(
  amountUsd: number | null | undefined,
  fxRate: number
): number {
  if (
    !Number.isFinite(amountUsd) ||
    amountUsd === null ||
    amountUsd === undefined
  ) {
    return 0;
  }

  if (!Number.isFinite(fxRate) || fxRate <= 0) {
    return amountUsd;
  }

  return amountUsd * fxRate;
}

export function formatCurrency(
  amount: number,
  currencyCode: SupportedCurrency,
  fractionDigits: number = APP_DISPLAY_DECIMALS
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(safeAmount);
}

export function formatCompactCurrency(
  amount: number,
  currencyCode: SupportedCurrency,
  fractionDigits: number = APP_DISPLAY_DECIMALS
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    notation: "compact",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(safeAmount);
}

function parseUsdDisplayValue(value: string): number | null {
  if (!value) return null;
  const normalized = value.trim().replace(/[$,\s]/g, "");
  const match = normalized.match(/^(-?\d+(?:\.\d+)?)([kKmMbB])?$/);
  if (!match) return null;

  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric)) return null;

  const suffix = match[2]?.toUpperCase();
  const multiplier =
    suffix === "K"
      ? 1_000
      : suffix === "M"
        ? 1_000_000
        : suffix === "B"
          ? 1_000_000_000
          : 1;

  return numeric * multiplier;
}

export function convertUsdDisplayToSelectedCurrency(
  usdDisplayValue: string,
  fxRate: number,
  currencyCode: SupportedCurrency,
  fractionDigits: number = APP_DISPLAY_DECIMALS
): string {
  const parsed = parseUsdDisplayValue(usdDisplayValue);
  if (!Number.isFinite(parsed)) {
    return usdDisplayValue;
  }

  return formatCompactCurrency(
    convertUsdToSelected(parsed, fxRate),
    currencyCode,
    fractionDigits
  );
}
