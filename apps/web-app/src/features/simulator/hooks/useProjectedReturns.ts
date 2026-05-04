"use client";

import { useMemo } from "react";
import { computeProjections } from "../utils/projectionMath";
import type { Projection } from "../types/simulator.types";

interface UseProjectedReturnsArgs {
  principalToken: number;
  apy: number | null;
  tokenPriceUsd: number;
}

/**
 * Pure derivation hook that returns the 1M / 6M / 1Y compound earnings table
 * for a given principal, APY and token price.
 */
export function useProjectedReturns({
  principalToken,
  apy,
  tokenPriceUsd,
}: UseProjectedReturnsArgs): Projection[] {
  return useMemo(
    () =>
      computeProjections({
        principalToken,
        apyPercent: apy,
        tokenPriceUsd,
      }),
    [principalToken, apy, tokenPriceUsd]
  );
}
