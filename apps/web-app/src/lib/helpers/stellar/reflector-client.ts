import { Client as ReflectorClient } from "@neko/reflector";
import { REFLECTOR_CONTRACT_ID } from "@/lib/constants/contracts";
import {
  allowHttpForSoroban,
  rpcUrl,
  networkPassphrase,
  stellarNetwork,
} from "@/lib/constants/network";

let _client: ReflectorClient | null = null;

/**
 * Returns a singleton Reflector oracle client bound to the pubnet contract.
 * Returns null on testnet/standalone  Reflector only exists on mainnet.
 */
export function getReflectorClient(): ReflectorClient | null {
  const net = stellarNetwork?.toUpperCase();
  if (net !== "PUBLIC") return null;
  if (_client) return _client;
  if (!rpcUrl) return null;
  _client = new ReflectorClient({
    contractId: REFLECTOR_CONTRACT_ID,
    networkPassphrase,
    rpcUrl,
    allowHttp: allowHttpForSoroban,
  });
  return _client;
}
