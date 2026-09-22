import {
  createOrchestrator,
  setContractErrorExtractor,
  type OrchestratorTokenInfo,
  type StellarNetworkId,
} from "@neko-protocol/orchestrator";
import {
  allowHttpForSoroban,
  horizonUrl,
  networkPassphrase,
  rpcUrl,
  stellarNetwork,
} from "@/lib/constants/network";
import {
  getAssetsConfig,
  getContractToCodeMap,
} from "@/lib/constants/assets.config";
import { extractContractError } from "@neko-protocol/orchestrator";

export function mapNetworkId(raw: string): StellarNetworkId {
  const n = raw.toUpperCase();
  if (n === "MAINNET" || n === "PUBLIC" || n === "PUBNET") return "PUBLIC";
  if (n === "TESTNET") return "TESTNET";
  if (n === "FUTURENET") return "FUTURENET";
  if (n === "LOCAL" || n === "STANDALONE") return "LOCAL";
  return "PUBLIC";
}

setContractErrorExtractor((cause, hint) => extractContractError(cause, hint));

function buildTokens(): Record<string, OrchestratorTokenInfo> {
  const assets = getAssetsConfig();
  const tokens: Record<string, OrchestratorTokenInfo> = {};
  for (const asset of Object.values(assets)) {
    tokens[asset.code] = {
      name: asset.name,
      contract: asset.contract,
      code: asset.code,
      decimals: asset.decimals,
      icon: asset.icon,
    };
  }
  return tokens;
}

export const { orchestrator, poolRegistry } = createOrchestrator({
  network: {
    id: mapNetworkId(stellarNetwork),
    rpcUrl,
    // Several adapters refuse an insecure RPC unless told it is intentional,
    // and a gateway path carries no protocol of its own to test.
    allowHttp: allowHttpForSoroban,
    passphrase: networkPassphrase,
    horizonUrl,
  },
  contractToCodeMap: getContractToCodeMap(),
  tokens: buildTokens(),
});
