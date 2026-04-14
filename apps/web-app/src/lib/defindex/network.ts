import { SupportedNetworks } from "@defindex/sdk";
import { stellarNetwork } from "@/lib/constants/network";

export function defindexNetworkFromEnv(): SupportedNetworks | null {
  switch (stellarNetwork) {
    case "PUBLIC":
      return SupportedNetworks.MAINNET;
    case "TESTNET":
    case "FUTURENET":
    case "LOCAL":
      return SupportedNetworks.TESTNET;
    default:
      return null;
  }
}
