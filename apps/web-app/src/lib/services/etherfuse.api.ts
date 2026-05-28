import type { EtherfuseYieldEntry } from "@neko/api-contracts";
import { backendClient } from "./backend-client";

export function getBondYields(): Promise<EtherfuseYieldEntry[]> {
  return backendClient.get<EtherfuseYieldEntry[]>("/v1/etherfuse/bond-yields");
}
