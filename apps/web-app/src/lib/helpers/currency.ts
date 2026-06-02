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

const _symbolCache = new Map<string, string>();
function getCurrencySymbol(currencyCode: string): string {
  if (_symbolCache.has(currencyCode)) return _symbolCache.get(currencyCode)!;
  const symbol =
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? "$";
  _symbolCache.set(currencyCode, symbol);
  return symbol;
}

export function formatCompactCurrency(
  amount: number,
  currencyCode: SupportedCurrency,
  fractionDigits: number = APP_DISPLAY_DECIMALS
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(safeAmount);

  if (abs >= 1_000 && abs < 1_000_000) {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${(safeAmount / 1_000).toFixed(2).replace(".", ",")}k`;
  }

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
  // Normalize: strip currency symbols and spaces, convert comma-decimal (e.g. 10,44k) to dot-decimal
  const stripped = value.trim().replace(/[$€£¥\s]/g, "");
  // If comma is used as decimal separator before a k/m/b suffix (e.g. "10,44k"), convert to dot
  const normalized = stripped
    .replace(/^(-?)([A-Z$€£¥]*)(\d+),(\d+)([kKmMbBR]*)$/, "$1$3.$4$5")
    .replace(/,/g, "");
  const match = normalized.match(/^(-?\d+(?:\.\d+)?)([kKmMbB])?$/i);
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
