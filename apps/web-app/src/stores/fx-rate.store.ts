"use client";

import { create } from "zustand";
import type { SupportedCurrency } from "@/stores/currency.store";

interface FxRateState {
  currency: SupportedCurrency;
  rate: number;
  setFxRate: (currency: SupportedCurrency, rate: number) => void;
}

export const useFxRateStore = create<FxRateState>((set) => ({
  currency: "USD",
  rate: 1,
  setFxRate: (currency, rate) =>
    set({
      currency,
      rate: Number.isFinite(rate) && rate > 0 ? rate : 1,
    }),
}));
