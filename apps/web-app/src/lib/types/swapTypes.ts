import type {
  Fee,
  ProviderId,
  ProviderIssue,
  SwapResult,
} from "oppia-swap-kit";

export interface Token {
  type: "native" | "contract";
  code?: string;
  issuer?: string;
  contract?: string;
}

export interface QuoteRequest {
  assetIn: Token | string;
  assetOut: Token | string;
  amount: string;
  tradeType: "EXACT_IN";
  slippageBps?: number;
  sourceAddress?: string;
}

export interface QuoteResponse {
  amountOut: string;
  amountIn: string;
  route: string;
  minToReceive: string;
  platformFee: string;
  sourceAddress: string | null;
  provider: ProviderId;
  expiresAt: number;
  fees: readonly Fee[];
  issues: ProviderIssue[];
  complete: boolean;
}

export interface BuildRequest {
  quote: QuoteResponse;
  from: string;
  to?: string;
}

export interface BuildResponse {
  xdr: string;
  swap: SwapResult;
}

export interface SendRequest {
  xdr: string;
  launchtube?: boolean;
}

export interface SendResponse {
  txHash: string;
}
