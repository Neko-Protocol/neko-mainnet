import type { PoolInfo } from "@/lib/orchestrator/types/pool.types";
import type { VaultView } from "@/features/vault/types/vault";

export interface SimulatorToken {
  code: string;
  name: string;
  iconSrc: string | null;
  contract?: string;
  balance: number;
  hasWallet: boolean;
}

export type DestinationType = "pool" | "vault" | "yield-token";

/** @deprecated Use DestinationType */
export type SimulatorDestinationKind = DestinationType;

export interface SimulatorDestination {
  kind: DestinationType;
  id: string;
  name: string;
  apy: number | null;
  tvlUsd: number | null;
  tvlLabel: string;
  protocol: string;
  strategyLabels: string[];
  acceptedTokenCodes: string[];
  raw: PoolInfo | VaultView | null;
  /** Neko RWA lending supply row — deep-links to /pools?supply= (not orchestrator PoolDetail). */
  lendingContractId?: string;
  lendingAssetCode?: string;
  bondCurrency?: string;
  bondIcon?: string;
  bondSymbol?: string;
  isFallbackApy?: boolean;
}

/** Yield-token row shape for typing builders (same fields as `SimulatorDestination` with bond fields set). */
export type YieldTokenDestination = SimulatorDestination & {
  kind: "yield-token";
  raw: null;
};

export interface Projection {
  periodLabel: string;
  months: number;
  earningsToken: number;
  earningsUsd: number;
  totalToken: number;
  totalUsd: number;
}

export type WizardStep = 1 | 2 | 3;

export interface SimulatorState {
  step: WizardStep;
  token: SimulatorToken | null;
  destination: SimulatorDestination | null;
  amount: string;
}

export type SimulatorAction =
  | { type: "selectToken"; token: SimulatorToken }
  | { type: "selectDestination"; destination: SimulatorDestination }
  | { type: "setAmount"; amount: string }
  | { type: "goNext" }
  | { type: "goBack" }
  | { type: "goToStep"; step: WizardStep }
  | { type: "reset" };
