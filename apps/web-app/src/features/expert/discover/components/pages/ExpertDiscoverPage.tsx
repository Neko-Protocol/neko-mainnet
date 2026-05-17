"use client";

import { useMemo } from "react";
import { DiscoverPageLayout } from "@/features/shared/discover/components/pages/DiscoverPageLayout";
import { AssetPriceCard } from "../ui/AssetPriceCard";
import { useEtherfuseYields } from "@/features/simulator/hooks/useEtherfuseYields";

export function ExpertDiscoverPage() {
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
        <AssetPriceCard
          tokenCode={tokenCode}
          apy={yieldsMap[tokenCode.toUpperCase()]}
        />
      )}
    />
  );
}
