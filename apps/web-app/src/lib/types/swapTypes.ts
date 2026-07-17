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
  tradeType: "EXACT_IN" | "EXACT_OUT";
  slippageBps?: number;
}

export interface QuoteResponse {
  amountOut: string;
  amountIn: string;
  route: string;
  minToReceive: string;
  platformFee: string;
}

export interface BuildRequest {
  quote: QuoteResponse;
  from: string;
  to?: string;
}

export interface BuildResponse {
  xdr: string;
}

export interface SendRequest {
  xdr: string;
  launchtube?: boolean;
}

export interface SendResponse {
  txHash: string;
}
