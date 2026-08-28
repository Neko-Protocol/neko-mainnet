import { getAssetTaxonomy } from "@/features/shared/discover/utils/assetClass";
import { isEtherfuseBondToken } from "@/features/simulator/strategies/hooks/useFilteredDestinations";
import type {
  SimulatorDestination,
  SimulatorState,
  SimulatorToken,
  WizardPhaseId,
} from "@/features/simulator/strategies/types/simulator.types";

/** Stablecoins that can explore sovereign bond holds (matches bond listing rule). */
export function isStablecoinBondExplorer(code: string): boolean {
  const taxonomy = getAssetTaxonomy(code.toUpperCase());
  return taxonomy?.class === "stablecoin" && code.toUpperCase() !== "USDY";
}

/**
 * After choosing bond hold (yield-token), offer optional pool/vault stack for
 * stablecoins exploring bonds OR native bond tokens (Opción A symmetry).
 */
export function shouldOfferOptionalStack(
  token: SimulatorToken | null,
  destination: SimulatorDestination | null
): boolean {
  if (!token || !destination || destination.kind !== "yield-token") {
    return false;
  }
  return (
    isStablecoinBondExplorer(token.code) || isEtherfuseBondToken(token.code)
  );
}

/** `label` is a translation key (see messages/{locale}/simulator.json → labels.step.*), not display text. */
export function wizardStepsMeta(
  token: SimulatorToken | null,
  destination: SimulatorDestination | null
): { phase: WizardPhaseId; label: string }[] {
  const steps: { phase: WizardPhaseId; label: string }[] = [
    { phase: "select_token", label: "labels.step.token" },
    { phase: "select_destination", label: "labels.step.destination" },
  ];
  if (shouldOfferOptionalStack(token, destination)) {
    steps.push({
      phase: "optional_stack",
      label: "labels.step.boost",
    });
  }
  steps.push({ phase: "simulate", label: "labels.step.earnings" });
  return steps;
}

export type SimulationResolved = {
  bondHold: SimulatorDestination | null;
  depositVenue: SimulatorDestination | null;
  projectionDestination: SimulatorDestination;
  /** Amount label token code for balances / price */
  amountAssetCode: string;
};

/** Effective projection + deposit targets from wizard domain state. */
export function resolveSimulationTargets(
  state: SimulatorState
): SimulationResolved | null {
  const { token, destination, stackVenue } = state;
  if (!token || !destination) return null;

  if (destination.kind === "yield-token") {
    const bondSymbol =
      destination.bondSymbol ?? destination.acceptedTokenCodes[0];
    const amountAssetCode = bondSymbol ?? token.code;

    if (stackVenue && stackVenue.kind !== "yield-token") {
      return {
        bondHold: destination,
        depositVenue: stackVenue,
        projectionDestination: stackVenue,
        amountAssetCode,
      };
    }

    return {
      bondHold: destination,
      depositVenue: null,
      projectionDestination: destination,
      amountAssetCode,
    };
  }

  return {
    bondHold: null,
    depositVenue: destination,
    projectionDestination: destination,
    amountAssetCode: token.code,
  };
}
