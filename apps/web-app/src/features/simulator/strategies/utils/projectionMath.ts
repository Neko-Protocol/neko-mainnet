import type { Projection } from "@/features/simulator/strategies/types/simulator.types";

export const PROJECTION_HORIZONS: { months: number; label: string }[] = [
  { months: 1, label: "1 month" },
  { months: 6, label: "6 months" },
  { months: 12, label: "1 year" },
];

/**
 * Compound earnings on a principal at a given annual percentage yield.
 * Formula: principal * ((1 + apy/100) ^ (months/12) - 1)
 */
export function computeCompoundEarnings(
  principal: number,
  apyPercent: number,
  months: number
): number {
  if (
    !Number.isFinite(principal) ||
    !Number.isFinite(apyPercent) ||
    !Number.isFinite(months) ||
    principal <= 0 ||
    apyPercent <= 0 ||
    months <= 0
  ) {
    return 0;
  }
  const rate = apyPercent / 100;
  const growth = Math.pow(1 + rate, months / 12) - 1;
  return principal * growth;
}

interface ProjectionInputs {
  principalToken: number;
  apyPercent: number | null;
  tokenPriceUsd: number;
}

export function computeProjections({
  principalToken,
  apyPercent,
  tokenPriceUsd,
}: ProjectionInputs): Projection[] {
  const apy = apyPercent ?? 0;
  const principalUsd = principalToken * (tokenPriceUsd > 0 ? tokenPriceUsd : 0);

  return PROJECTION_HORIZONS.map(({ months, label }) => {
    const earningsToken = computeCompoundEarnings(principalToken, apy, months);
    const totalToken = principalToken + earningsToken;
    const earningsUsd = tokenPriceUsd > 0 ? earningsToken * tokenPriceUsd : 0;
    const totalUsd = principalUsd + earningsUsd;

    return {
      periodLabel: label,
      months,
      earningsToken,
      earningsUsd,
      totalToken,
      totalUsd,
    };
  });
}
