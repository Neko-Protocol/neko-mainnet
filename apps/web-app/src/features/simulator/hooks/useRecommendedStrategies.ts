"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePools } from "@/lib/orchestrator/hooks/usePools";
import { useDefindexVaults } from "@/features/shared/vault/hooks/useDefindexVaults";
import { getTokenIcon } from "@/lib/helpers/tokenUtils";
import type { RecommendedStrategyDto } from "../types/recommended.types";
import type {
  SimulatorDestination,
  SimulatorToken,
} from "../types/simulator.types";
import {
  buildDestinationIndex,
  findDestinationById,
} from "../utils/buildDestinationIndex";
import { useSimulatorTokens } from "./useSimulatorTokens";
import { useEtherfuseYields } from "./useEtherfuseYields";

export interface ResolvedRecommendedStrategy {
  dto: RecommendedStrategyDto;
  token: SimulatorToken;
  destination: SimulatorDestination;
  stackVenue: SimulatorDestination | null;
  resolved: boolean;
}

async function fetchRecommended(): Promise<RecommendedStrategyDto[]> {
  const res = await fetch("/api/strategies/recommended");
  if (!res.ok) throw new Error("Failed to fetch recommended strategies");
  const data = (await res.json()) as { strategies: RecommendedStrategyDto[] };
  return data.strategies ?? [];
}

function minimalToken(code: string): SimulatorToken {
  return {
    code,
    name: code,
    iconSrc: getTokenIcon(code),
    balance: 0,
    hasWallet: false,
  };
}

export function useRecommendedStrategies() {
  const recommendedQuery = useQuery({
    queryKey: ["recommended-strategies"],
    queryFn: fetchRecommended,
    staleTime: 60_000,
  });

  const pools = usePools(true);
  const vaults = useDefindexVaults();
  const yieldsQuery = useEtherfuseYields();
  const { tokens: simulatorTokens } = useSimulatorTokens();

  const destinationIndex = useMemo(
    () =>
      buildDestinationIndex(pools.data, vaults.data?.vaults, yieldsQuery.data),
    [pools.data, vaults.data, yieldsQuery.data]
  );

  const items = useMemo<ResolvedRecommendedStrategy[]>(() => {
    const dtos = recommendedQuery.data ?? [];
    const resolved: ResolvedRecommendedStrategy[] = [];

    for (const dto of dtos) {
      const destination = findDestinationById(
        destinationIndex,
        dto.destinationKind,
        dto.destinationId
      );
      if (!destination) continue;

      let stackVenue: SimulatorDestination | null = null;
      if (dto.stackKind && dto.stackId) {
        stackVenue = findDestinationById(
          destinationIndex,
          dto.stackKind,
          dto.stackId
        );
        if (!stackVenue) continue;
      }

      const token =
        simulatorTokens.find(
          (t) => t.code.toUpperCase() === dto.tokenCode.toUpperCase()
        ) ?? minimalToken(dto.tokenCode);

      resolved.push({
        dto,
        token: { ...token, code: dto.tokenCode },
        destination,
        stackVenue,
        resolved: true,
      });
    }

    return resolved;
  }, [recommendedQuery.data, destinationIndex, simulatorTokens]);

  const isLoading =
    recommendedQuery.isPending ||
    pools.isLoading ||
    vaults.isLoading ||
    yieldsQuery.isPending;

  return {
    items,
    isLoading,
    isError: recommendedQuery.isError,
  };
}
