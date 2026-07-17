import { soroswap } from "@neko/orchestrator";

export type Token = soroswap.Token;
export type QuoteRequest = soroswap.QuoteRequest;
export type QuoteResponse = soroswap.QuoteResponse;
export type PlatformFee = NonNullable<QuoteResponse["platformFee"]>;
export type BuildRequest = soroswap.BuildRequest;
export type BuildResponse = soroswap.BuildResponse;
export type SendRequest = soroswap.SendRequest;
export type SendResponse = soroswap.SendResponse;
export type AddLiquidityRequest = soroswap.AddLiquidityRequest;
export type AddLiquidityResponse = soroswap.AddLiquidityResponse;
export type RemoveLiquidityRequest = soroswap.RemoveLiquidityRequest;
export type RemoveLiquidityResponse = soroswap.RemoveLiquidityResponse;
export type PoolInfo = soroswap.PoolInfo;
export type GetPoolRequest = soroswap.GetPoolRequest;

export const TrustlineRequiredError = soroswap.TrustlineRequiredError;

export {
  getAvailableTokens,
  getTokens,
  getTokenAddress,
  TOKENS,
} from "./tokens";

export {
  getApiKey,
  setApiKey,
  hasApiKey,
  invalidateSoroswapSDK,
  isValidContractAddress,
  getTokenExplorerUrl,
} from "./utils";

export {
  getPool,
  getQuote,
  buildTransaction,
  sendTransaction,
  addLiquidity,
  removeLiquidity,
  submitClassicTrustlineToHorizon,
} from "./quotes";
