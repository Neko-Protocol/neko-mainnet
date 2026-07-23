"use client";

import { useFormatter } from "next-intl";
import type { DateTimeFormatOptions } from "use-intl";
import { APP_DISPLAY_DECIMALS } from "@/lib/constants/display";
import type { SupportedCurrency } from "@/stores/currency.store";

/**
 * Locale-aware replacement for the ad-hoc `Intl.NumberFormat("en-US", ...)` /
 * `toLocaleDateString()` calls scattered across features/shared. Display
 * locale (en/es, from next-intl) and fiat currency code (USD/MXN/etc., from
 * currency.store.ts) are independent parameters here on purpose — a user can
 * want Spanish UI with USD prices. Not yet wired into any call site; that
 * migration happens per-phase (see i18n rollout plan).
 */
export function useLocaleFormatter() {
  const format = useFormatter();

  function formatCurrency(
    amount: number,
    currencyCode: SupportedCurrency,
    fractionDigits: number = APP_DISPLAY_DECIMALS
  ): string {
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return format.number(safeAmount, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  }

  function formatCompactCurrency(
    amount: number,
    currencyCode: SupportedCurrency,
    fractionDigits: number = APP_DISPLAY_DECIMALS
  ): string {
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return format.number(safeAmount, {
      style: "currency",
      currency: currencyCode,
      notation: "compact",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  }

  /** Plain grouped number (no currency symbol) — for raw token amounts. */
  function formatNumber(
    amount: number,
    fractionDigits: number = APP_DISPLAY_DECIMALS
  ): string {
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return format.number(safeAmount, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  }

  function formatDate(
    date: Date | number,
    options?: DateTimeFormatOptions
  ): string {
    return format.dateTime(date, options);
  }

  return { formatCurrency, formatCompactCurrency, formatNumber, formatDate };
}
