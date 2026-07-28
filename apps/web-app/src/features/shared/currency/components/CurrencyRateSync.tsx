"use client";

import { useFxRate } from "@/hooks/useFxRate";

export function CurrencyRateSync() {
  useFxRate();
  return null;
}
