import { SupportedNetworks } from "@defindex/sdk";

/**
 * Map a stellar network identifier (e.g. `PUBLIC`, `TESTNET`, `LOCAL`,
 * `FUTURENET`) to the DeFindex SDK's `SupportedNetworks` enum.
 * Returns `null` if the input doesn't correspond to a supported network.
 */
export function defindexNetworkFromString(
  stellarNetwork: string | null | undefined
): SupportedNetworks | null {
  switch (stellarNetwork) {
    case "PUBLIC":
    case "MAINNET":
      return SupportedNetworks.MAINNET;
    case "TESTNET":
    case "FUTURENET":
    case "LOCAL":
      return SupportedNetworks.TESTNET;
    default:
      return null;
  }
}
