import { create } from "zustand";
import { persist } from "zustand/middleware";

export const SUPPORTED_CURRENCIES = [
  "USD",
  "MXN",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "BRL",
  "COP",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

interface CurrencyState {
  selectedCurrency: SupportedCurrency;
  setSelectedCurrency: (currency: SupportedCurrency) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      selectedCurrency: "USD",
      setSelectedCurrency: (currency) => set({ selectedCurrency: currency }),
    }),
    { name: "selected-currency" }
  )
);
