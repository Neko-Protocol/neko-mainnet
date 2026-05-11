import {
  APP_DISPLAY_DECIMALS,
  SUMMARY_DISPLAY_DECIMALS,
} from "@/lib/constants/display";
import {
  convertUsdToSelected,
  formatCompactCurrency,
} from "@/lib/helpers/currency";
import { useCurrencyStore } from "@/stores/currency.store";
import { useFxRateStore } from "@/stores/fx-rate.store";

const amountFormatters = new Map<number, Intl.NumberFormat>();

function getAmountFormatter(fractionDigits: number): Intl.NumberFormat {
  let f = amountFormatters.get(fractionDigits);
  if (!f) {
    f = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    amountFormatters.set(fractionDigits, f);
  }
  return f;
}

export function safeParseFloat(
  value: string | number | null | undefined
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/,/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseBalance(balance: string | null | undefined): number {
  return safeParseFloat(balance);
}

export function formatLiquidity(
  value: number | string,
  fractionDigits: number = APP_DISPLAY_DECIMALS
): string {
  const num = safeParseFloat(value);
  const selectedCurrency = useCurrencyStore.getState().selectedCurrency;

  if (selectedCurrency === "USD") {
    return formatCompactCurrency(num, "USD", fractionDigits);
  }

  const { currency, rate } = useFxRateStore.getState();
  const effectiveRate = currency === selectedCurrency ? rate : 1;
  return formatCompactCurrency(
    convertUsdToSelected(num, effectiveRate),
    selectedCurrency,
    fractionDigits
  );
}

/**
 * Format a numeric value for UI with fixed fraction digits (default
 * {@link APP_DISPLAY_DECIMALS}), grouped with en-US thousands separators.
 */
export function formatAmount(
  value: number | string,
  fractionDigits: number = APP_DISPLAY_DECIMALS
): string {
  const num =
    typeof value === "string"
      ? parseFloat(String(value).replace(/,/g, ""))
      : value;
  const fmt = getAmountFormatter(fractionDigits);
  if (!Number.isFinite(num)) return fmt.format(0);
  return fmt.format(num);
}

/**
 * Shorten decimal runs in a pre-formatted label (compact TVL, APY %, etc.).
 * Used where the view needs {@link SUMMARY_DISPLAY_DECIMALS} without raw numbers.
 */
export function squeezeSummaryDecimals(
  label: string,
  fractionDigits: number = SUMMARY_DISPLAY_DECIMALS
): string {
  if (!label || label === "") return label;
  return label.replace(/(\d[\d,]*\.\d+)/g, (chunk) => {
    const n = parseFloat(chunk.replace(/,/g, ""));
    return Number.isFinite(n) ? n.toFixed(fractionDigits) : chunk;
  });
}
