import type { Network } from "@blend-capital/blend-sdk";

import {
  getBlendNetwork as pkgGetBlendNetwork,
  getBlendPoolIds as pkgGetBlendPoolIds,
} from "@neko-protocol/orchestrator";
import {
  allowHttpForSoroban,
  networkPassphrase,
  rpcUrl,
  stellarNetwork,
} from "@/lib/constants/network";
import { mapNetworkId } from "../_bootstrap";

export function getBlendNetwork(): Network {
  return pkgGetBlendNetwork({
    id: mapNetworkId(stellarNetwork),
    rpcUrl,
    allowHttp: allowHttpForSoroban,
    passphrase: networkPassphrase,
  });
}

export function getBlendPoolIds(): string[] {
  return pkgGetBlendPoolIds(mapNetworkId(stellarNetwork));
}

export {
  BLEND_POOLS,
  BLEND_ASSET_CODES,
  BLEND_VAULT_ONLY_RESERVES,
  BLEND_POOL_VAULTS,
} from "@neko-protocol/orchestrator";
