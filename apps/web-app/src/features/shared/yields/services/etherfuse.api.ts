import type { EtherfuseYieldEntry } from "@neko-protocol/api-contracts";
import { backendClient } from "@/lib/services/backend-client";

export function getBondYields(): Promise<EtherfuseYieldEntry[]> {
  return backendClient.get<EtherfuseYieldEntry[]>("/v1/etherfuse/bond-yields");
}
