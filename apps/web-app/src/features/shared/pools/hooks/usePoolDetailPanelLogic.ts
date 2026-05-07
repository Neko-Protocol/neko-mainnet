"use client";

import { useMemo, useState } from "react";
import { useTokenPrice } from "@/hooks/useTokenPrice";
import { useFxRate } from "@/hooks/useFxRate";
import { convertUsdToSelected, formatCurrency } from "@/lib/helpers/currency";
import { useCurrencyStore } from "@/stores/currency.store";
import type { PoolDetailPanelPool } from "@/features/shared/pools/components/ui/pool-detail-panel/types";

export function usePoolDetailPanelLogic(pool: PoolDetailPanelPool) {
  const defaultCollateral = pool.collateralOptions?.[0];
  const [selectedCollateralAddress, setSelectedCollateralAddress] = useState(
    defaultCollateral?.address ?? ""
  );
  const [collateralInputAmount, setCollateralInputAmount] = useState("");

  const selectedCollateral = useMemo(
    () =>
      pool.collateralOptions?.find(
        (o) => o.address === selectedCollateralAddress
      ) ?? pool.collateralOptions?.[0],
    [pool.collateralOptions, selectedCollateralAddress]
  );

  const { price: token1Price } = useTokenPrice(pool.token1.symbol);
  const { price: token2Price } = useTokenPrice(pool.token2.symbol);
  const { price: selectedCollateralPrice } = useTokenPrice(
    selectedCollateral?.symbol
  );

  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const { rate: fxRate } = useFxRate({ currency: selectedCurrency });
  const formatUsdValue = (amountUsd: number) =>
    formatCurrency(convertUsdToSelected(amountUsd, fxRate), selectedCurrency);

  const collateralInputUsd = useMemo(() => {
    const parsed = parseFloat(collateralInputAmount);
    if (!parsed || !selectedCollateralPrice) return 0;
    return parsed * selectedCollateralPrice;
  }, [collateralInputAmount, selectedCollateralPrice]);

  const dynamicBorrowMax = useMemo(() => {
    if (
      !pool.collateralOptions?.length ||
      !selectedCollateral ||
      !collateralInputAmount
    )
      return null;
    const collateralUsd = collateralInputUsd;
    const cFactor = selectedCollateral.cFactor ?? 0;
    const lFactor = pool.lFactor ?? 1;
    const borrowPrice = token2Price ?? 0;
    if (collateralUsd <= 0 || borrowPrice <= 0) return null;
    return (collateralUsd * cFactor) / (borrowPrice * lFactor);
  }, [
    collateralInputUsd,
    selectedCollateral,
    collateralInputAmount,
    token2Price,
    pool.lFactor,
    pool.collateralOptions,
  ]);

  const selectCollateral = (address: string) => {
    setSelectedCollateralAddress(address);
    setCollateralInputAmount("");
  };

  return {
    token1Price,
    token2Price,
    selectedCollateralAddress,
    collateralInputAmount,
    setCollateralInputAmount,
    selectedCollateral,
    collateralInputUsd,
    dynamicBorrowMax,
    formatUsdValue,
    selectCollateral,
  };
}
