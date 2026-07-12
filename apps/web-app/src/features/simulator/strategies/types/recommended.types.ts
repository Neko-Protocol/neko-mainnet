import type { DestinationType } from "@/features/simulator/strategies/types/simulator.types";

export interface RecommendedStrategyDto {
  id: string;
  name: string;
  description: string | null;
  tokenCode: string;
  destinationKind: DestinationType;
  destinationId: string;
  stackKind: DestinationType | null;
  stackId: string | null;
  amount: string | null;
  snapshotApy: number | null;
}

export interface CatalogDestination {
  kind: DestinationType;
  id: string;
  name: string;
  protocol: string;
  apy: number | null;
  acceptedTokenCodes: string[];
}
