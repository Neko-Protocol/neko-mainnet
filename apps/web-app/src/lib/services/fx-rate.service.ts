import type { SupportedCurrency } from "@/stores/currency.store";

interface FrankfurterRateResponse {
  amount?: number | string;
  base?: string;
  rates?: Record<string, number | string>;
  rate?: number | string;
}

const FX_BASE_URL = "https://api.frankfurter.dev/v2";

function toPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

export class FxRateService {
  async getUsdToCurrencyRate(currency: SupportedCurrency): Promise<number> {
    if (currency === "USD") {
      return 1;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      const response = await fetch(`${FX_BASE_URL}/rate/USD/${currency}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return 1;
      }

      const data = (await response.json()) as FrankfurterRateResponse;

      const directRate = toPositiveNumber(data.rate);
      if (directRate) {
        return directRate;
      }

      const nestedRate = toPositiveNumber(data.rates?.[currency]);
      if (nestedRate) {
        return nestedRate;
      }

      return 1;
    } catch {
      return 1;
    }
  }
}

export const fxRateService = new FxRateService();
