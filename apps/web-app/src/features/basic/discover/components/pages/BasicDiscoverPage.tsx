"use client";

import { useMemo } from "react";
import { DiscoverPageLayout } from "@/features/shared/discover/components/pages/DiscoverPageLayout";
import { BasicAssetPriceCard } from "../ui/BasicAssetPriceCard";
import { useEtherfuseYields } from "@/features/simulator/hooks/useEtherfuseYields";

export function BasicDiscoverPage() {
  const { data: yields } = useEtherfuseYields();

  const yieldsMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of yields ?? []) {
      map[entry.symbol.toUpperCase()] = entry.apy;
    }
    return map;
  }, [yields]);

  return (
    <DiscoverPageLayout
      renderCard={(tokenCode) => (
        <BasicAssetPriceCard
          tokenCode={tokenCode}
          apy={yieldsMap[tokenCode.toUpperCase()]}
        />
      )}
    />
  );
}
