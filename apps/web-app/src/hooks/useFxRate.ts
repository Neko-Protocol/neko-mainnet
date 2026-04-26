import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fxRateService } from "@/lib/services/fx-rate.service";
import {
  type SupportedCurrency,
  useCurrencyStore,
} from "@/stores/currency.store";
import { useFxRateStore } from "@/stores/fx-rate.store";

type UseFxRateOptions = {
  currency?: SupportedCurrency;
};

export function useFxRate(options?: UseFxRateOptions) {
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const setFxRate = useFxRateStore((state) => state.setFxRate);
  const currency = options?.currency ?? selectedCurrency;

  const query = useQuery<number, Error>({
    queryKey: ["fx-rate", "USD", currency],
    queryFn: async () => fxRateService.getUsdToCurrencyRate(currency),
    enabled: currency !== "USD",
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    throwOnError: false,
  });

  useEffect(() => {
    setFxRate(currency, query.data ?? 1);
  }, [currency, query.data, setFxRate]);

  return {
    ...query,
    rate: query.data ?? 1,
    currency,
  };
}
