import { soroswap, type OrchestratorNetwork } from "@neko/orchestrator";
import {
  horizonUrl,
  networkPassphrase,
  rpcUrl,
  stellarNetwork,
} from "@/lib/constants/network";
import { buildRegistry } from "./tokens";
import { getApiKey } from "./utils";

const buildOrchestratorNetwork = (): OrchestratorNetwork => ({
  id: stellarNetwork,
  rpcUrl,
  passphrase: networkPassphrase,
  allowHttp: false,
  horizonUrl,
});

const buildCtx = (): soroswap.SoroswapNetworkContext => ({
  network: buildOrchestratorNetwork(),
  horizonUrl,
  registry: buildRegistry(),
  apiKey: getApiKey(),
});

export async function submitClassicTrustlineToHorizon(
  signedXdr: string
): Promise<void> {
  return soroswap.submitClassicTrustlineToHorizon(signedXdr, horizonUrl);
}

export const getPool = async (
  request: soroswap.GetPoolRequest
): Promise<soroswap.PoolInfo[]> => soroswap.getPool(request, buildCtx());

export const getQuote = async (
  request: soroswap.QuoteRequest
): Promise<soroswap.QuoteResponse | undefined> =>
  soroswap.getQuote(request, buildCtx());

export const buildTransaction = async (
  request: soroswap.BuildRequest
): Promise<soroswap.BuildResponse> =>
  soroswap.buildTransaction(request, buildCtx());

export const sendTransaction = async (
  request: soroswap.SendRequest
): Promise<soroswap.SendResponse> =>
  soroswap.sendTransaction(request, buildCtx());

export const addLiquidity = async (
  request: soroswap.AddLiquidityRequest
): Promise<soroswap.AddLiquidityResponse> =>
  soroswap.addLiquidity(request, buildCtx());

export const removeLiquidity = async (
  request: soroswap.RemoveLiquidityRequest
): Promise<soroswap.RemoveLiquidityResponse> =>
  soroswap.removeLiquidity(request, buildCtx());
