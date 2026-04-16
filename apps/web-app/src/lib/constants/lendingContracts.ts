import { networks } from "@neko/lending";
import { stellarNetwork } from "@/lib/constants/network";

type LendingContracts = {
  pool1ContractId: string;
  pool2ContractId: string;
};

function resolveNetworkKey(): "mainnet" | "testnet" {
  const hasMainnet = "mainnet" in (networks as Record<string, unknown>);
  if (stellarNetwork === "PUBLIC" && hasMainnet) {
    return "mainnet";
  }
  return "testnet";
}

export function getLendingContracts(): LendingContracts {
  const key = resolveNetworkKey();
  return (networks as Record<string, LendingContracts>)[key];
}
