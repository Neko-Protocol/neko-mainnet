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
  protocols?: string[];
  slippageBps?: number;
  maxHops?: number;
  feeBps?: number;
  referralId?: string;
}

export interface PlatformFee {
  feeBps: number;
  feeAmount: string;
}

export interface QuoteResponse {
  amountOut: string;
  amountIn: string;
  routes?: unknown[];
  priceImpact?: string;
  protocol?: string;
  platformFee?: PlatformFee;
  _sdkQuote?: unknown;
}

export interface BuildRequest {
  quote: QuoteResponse;
  from: string;
  to?: string;
  referralId?: string;
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

export interface AddLiquidityRequest {
  assetA: Token | string;
  assetB: Token | string;
  amountA: string;
  amountB: string;
  to: string;
  slippageBps?: number;
}

export interface AddLiquidityResponse {
  xdr: string;
}

export interface RemoveLiquidityRequest {
  assetA: Token | string;
  assetB: Token | string;
  liquidity: bigint | string;
  amountA: bigint | string;
  amountB: bigint | string;
  to: string;
  slippageBps?: number;
}

export interface RemoveLiquidityResponse {
  xdr: string;
}

export interface PoolInfo {
  protocol: string;
  address: string;
  tokenA: string;
  tokenB: string;
  reserveA: string;
  reserveB: string;
  ledger: number;
}

export interface GetPoolRequest {
  tokenA: Token | string;
  tokenB: Token | string;
  protocols?: string[];
}

export class TrustlineRequiredError extends Error {
  readonly trustlineXdr: string;
  readonly signer: string;
  readonly assetCode: string;
  readonly assetIssuer: string;

  constructor(data: {
    message: string;
    trustlineXdr: string;
    signer: string;
    assetCode: string;
    assetIssuer: string;
  }) {
    super(data.message);
    this.name = "TrustlineRequiredError";
    this.trustlineXdr = data.trustlineXdr;
    this.signer = data.signer;
    this.assetCode = data.assetCode;
    this.assetIssuer = data.assetIssuer;
  }
}
