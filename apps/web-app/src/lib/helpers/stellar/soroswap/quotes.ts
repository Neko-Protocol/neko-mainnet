import {
  rpc,
  Contract,
  Address,
  TransactionBuilder,
  Account,
  Keypair,
  scValToNative,
  nativeToScVal,
  xdr,
} from "@stellar/stellar-sdk";
import { horizonUrl, networkPassphrase, rpcUrl } from "@/lib/constants/network";
import { getCurrentNetwork, getAvailableTokens } from "./tokens";
import {
  getApiKey,
  getSDKNetwork,
  getSoroswapSDK,
  makeAPIRequest,
  toSmallestUnit,
  isValidContractAddress,
  formatTokenForAPI,
} from "./utils";
import { TrustlineRequiredError } from "../../../types/soroswapTypes";
import type {
  QuoteRequest,
  QuoteResponse,
  BuildRequest,
  BuildResponse,
  SendRequest,
  SendResponse,
  AddLiquidityRequest,
  AddLiquidityResponse,
  RemoveLiquidityRequest,
  RemoveLiquidityResponse,
  PoolInfo,
  GetPoolRequest,
} from "../../../types/soroswapTypes";

const SOROSWAP_API_URL = "https://api.soroswap.finance";

export async function submitClassicTrustlineToHorizon(
  signedXdr: string
): Promise<void> {
  const res = await fetch(`${horizonUrl}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ tx: signedXdr }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Horizon rejected trustline transaction: ${body}`);
  }
}

/**
 * Pairs that the Soroswap API has rejected with "no path found".
 * Cached so subsequent quote refreshes skip the slow API call entirely.
 */
const apiRejectedPairs = new Set<string>();

function normalizeAtomicAmount(value: bigint | string, label: string): bigint {
  if (typeof value === "bigint") return value;
  const raw = value.trim();
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${label} must be an atomic integer amount`);
  }
  return BigInt(raw);
}

/**
 * Computes a swap quote from on-chain pair reserves using the Uniswap v2 AMM formula.
 * 1. Gets factory + router addresses from the SDK.
 * 2. Simulates `get_pair(tokenA, tokenB)` on the factory → pair contract address.
 * 3. Simulates `get_reserves()` on the pair → (reserveA, reserveB, timestamp).
 * 4. Soroswap sorts tokens by address (smaller = token_0 = reserveA).
 * 5. Applies the AMM formula: out = (in*997*reserveOut) / (reserveIn*1000 + in*997).
 */
const getDirectPoolQuote = async (
  assetIn: string,
  assetOut: string,
  amountInSmallestUnit: bigint,
  slippageBps: number
): Promise<QuoteResponse> => {
  const sdk = getSoroswapSDK();
  const sdkNet = getSDKNetwork();
  const [{ address: routerAddress }, { address: factoryAddress }] =
    await Promise.all([
      sdk.getContractAddress(sdkNet, "router"),
      sdk.getContractAddress(sdkNet, "factory"),
    ]);
  if (!routerAddress || !factoryAddress) {
    throw new Error("Soroswap router or factory not found for this network");
  }

  const server = new rpc.Server(rpcUrl);
  const dummyAccount = new Account(Keypair.random().publicKey(), "0");

  const factory = new Contract(factoryAddress);
  const getPairTx = new TransactionBuilder(dummyAccount, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(
      factory.call(
        "get_pair",
        new Address(assetIn).toScVal(),
        new Address(assetOut).toScVal()
      )
    )
    .setTimeout(30)
    .build();

  const pairSim = await server.simulateTransaction(getPairTx);
  if (!("result" in pairSim) || !pairSim.result?.retval) {
    throw new Error("No liquidity pair exists for this token combination");
  }

  const pairAddress = scValToNative(pairSim.result.retval) as string;
  if (!pairAddress || typeof pairAddress !== "string") {
    throw new Error("No liquidity pair exists for this token combination");
  }

  const pair = new Contract(pairAddress);
  const reservesTx = new TransactionBuilder(
    new Account(Keypair.random().publicKey(), "0"),
    { fee: "100", networkPassphrase }
  )
    .addOperation(pair.call("get_reserves"))
    .setTimeout(30)
    .build();

  const reservesSim = await server.simulateTransaction(reservesTx);
  if (!("result" in reservesSim) || !reservesSim.result?.retval) {
    throw new Error("Failed to read pool reserves — simulation error");
  }

  const reservesRaw = scValToNative(reservesSim.result.retval) as bigint[];
  if (!Array.isArray(reservesRaw) || reservesRaw.length < 2) {
    throw new Error("Invalid reserves data from pool");
  }

  const reserveA = BigInt(reservesRaw[0].toString());
  const reserveB = BigInt(reservesRaw[1].toString());
  if (reserveA <= 0n || reserveB <= 0n) {
    throw new Error("Pool has insufficient reserves");
  }

  const isAin = assetIn < assetOut;
  const reserveIn = isAin ? reserveA : reserveB;
  const reserveOut = isAin ? reserveB : reserveA;

  const amountInWithFee = amountInSmallestUnit * 997n;
  const amountOut =
    (amountInWithFee * reserveOut) / (reserveIn * 1000n + amountInWithFee);

  if (amountOut <= BigInt(0)) {
    throw new Error("Swap would produce zero output — try a larger amount");
  }

  const threshold = (amountOut * BigInt(10000 - slippageBps)) / BigInt(10000);

  const priceImpactPct = "0";

  const sdkQuote = {
    assetIn,
    assetOut,
    amountIn: amountInSmallestUnit.toString(),
    amountOut: amountOut.toString(),
    otherAmountThreshold: threshold.toString(),
    priceImpactPct,
    tradeType: "EXACT_IN",
    platform: "soroswap",
    rawTrade: null,
    routerAddress,
    routePlan: [
      {
        swapInfo: { protocol: "soroswap", path: [assetIn, assetOut] },
        percent: "100",
      },
    ],
  };

  return {
    amountOut: amountOut.toString(),
    amountIn: amountInSmallestUnit.toString(),
    priceImpact: priceImpactPct,
    protocol: "soroswap",
    _sdkQuote: sdkQuote,
  };
};

export const getPool = async (request: GetPoolRequest): Promise<PoolInfo[]> => {
  const tokenA = formatTokenForAPI(request.tokenA);
  const tokenB = formatTokenForAPI(request.tokenB);

  if (!isValidContractAddress(tokenA)) {
    throw new Error(
      `Invalid contract address for tokenA: ${tokenA}. Contract addresses must start with 'C' and be 56 characters long.`
    );
  }
  if (!isValidContractAddress(tokenB)) {
    throw new Error(
      `Invalid contract address for tokenB: ${tokenB}. Contract addresses must start with 'C' and be 56 characters long.`
    );
  }

  const network = getCurrentNetwork();
  const apiNetwork =
    network === "standalone" || network === "local" ? "testnet" : network;

  const protocols = request.protocols || ["soroswap"];
  const protocolParam = protocols
    .map((p: string) => `protocol=${encodeURIComponent(p)}`)
    .join("&");
  const queryParams = `?network=${apiNetwork}&${protocolParam}`;
  const endpoint = `/pools/${tokenA}/${tokenB}${queryParams}`;
  const poolRequestTimeoutMs = 8_000;

  try {
    const pools = await makeAPIRequest<PoolInfo[]>(endpoint, {
      method: "GET",
      timeout: poolRequestTimeoutMs,
    } as RequestInit & { timeout?: number });

    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_VERBOSE_LOGGING === "true"
    ) {
      console.log("💧 Pool information received:", pools);
    }

    return pools;
  } catch (error) {
    if (error instanceof Error) {
      const errorMessage = error.message;

      if (
        errorMessage.includes("404") ||
        errorMessage.includes("Not Found") ||
        errorMessage.includes("429")
      ) {
        return [];
      }

      if (
        errorMessage.includes("API key") ||
        errorMessage.includes("401") ||
        errorMessage.includes("403")
      ) {
        throw new Error(
          "Soroswap API key is invalid or expired. Please check your API key configuration at https://api.soroswap.finance/login"
        );
      }

      throw error;
    }

    throw error;
  }
};

export const getQuote = async (
  request: QuoteRequest
): Promise<QuoteResponse | undefined> => {
  const assetIn = formatTokenForAPI(request.assetIn);
  const assetOut = formatTokenForAPI(request.assetOut);

  if (!isValidContractAddress(assetIn)) {
    throw new Error(
      `Invalid contract address for assetIn: ${assetIn}. Contract addresses must start with 'C' and be 56 characters long.`
    );
  }
  if (!isValidContractAddress(assetOut)) {
    throw new Error(
      `Invalid contract address for assetOut: ${assetOut}. Contract addresses must start with 'C' and be 56 characters long.`
    );
  }

  const amountInSmallestUnit = toSmallestUnit(request.amount, 7);

  if (amountInSmallestUnit <= BigInt(0)) {
    throw new Error(
      `Invalid amount: ${request.amount}. Amount must be greater than 0.`
    );
  }

  const sdkNetwork = getSDKNetwork();

  const tradeType = request.tradeType || "EXACT_IN";

  const protocols = request.protocols?.length
    ? request.protocols
    : ["soroswap"];

  const pairKey = `${assetIn}-${assetOut}`;

  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("Soroswap API key not configured");
    }

    if (apiRejectedPairs.has(pairKey)) {
      return getDirectPoolQuote(
        assetIn,
        assetOut,
        amountInSmallestUnit,
        request.slippageBps ?? 500
      );
    }

    const quoteRequestBody: Record<string, unknown> = {
      assetIn,
      assetOut,
      amount: amountInSmallestUnit.toString(),
      tradeType,
      protocols,
      slippageBps: request.slippageBps || 500,
      maxHops: request.maxHops || 3,
    };

    if (request.feeBps && request.referralId) {
      quoteRequestBody.feeBps = request.feeBps;
      quoteRequestBody.referralId = request.referralId;
    }

    const apiResponse = await fetch(
      `${SOROSWAP_API_URL}/quote?network=${sdkNetwork}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(quoteRequestBody),
      }
    );

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      const detail: string = errorData.detail || errorData.title || "";
      const detailLower = detail.toLowerCase();

      if (
        detailLower.includes("no path") ||
        detailLower.includes("path not found")
      ) {
        apiRejectedPairs.add(pairKey);
        return getDirectPoolQuote(
          assetIn,
          assetOut,
          amountInSmallestUnit,
          request.slippageBps ?? 500
        );
      }

      throw new Error(
        `API request failed: ${apiResponse.status} ${apiResponse.statusText}. ${JSON.stringify(errorData)}`
      );
    }

    const quoteResponse = (await apiResponse.json()) as {
      assetIn: string;
      assetOut: string;
      amountIn: string;
      amountOut: string;
      otherAmountThreshold: string;
      priceImpactPct: string;
      tradeType: string;
      platform: string;
      rawTrade: unknown;
      routes?: unknown[];
      routePlan: Array<{
        swapInfo: { protocol: string; path: string[] };
        percent: string;
      }>;
      platformFee?: { feeBps: number; feeAmount: string };
    };

    const response: QuoteResponse = {
      amountOut: quoteResponse.amountOut.toString(),
      amountIn: quoteResponse.amountIn.toString(),
      priceImpact: quoteResponse.priceImpactPct?.toString() || "0",
      protocol: quoteResponse.platform || "soroswap",
      _sdkQuote: quoteResponse,
    };

    if (quoteResponse.platformFee) {
      response.platformFee = quoteResponse.platformFee;
    }

    if ("routes" in quoteResponse && quoteResponse.routes) {
      response.routes = quoteResponse.routes as unknown[];
    }

    return response;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? (error as Error).message : String(error);
    const errorStr = errorMessage.toLowerCase();

    if (errorStr.includes("no path") || errorStr.includes("no liquidity")) {
      const availableTokens = getAvailableTokens();
      const getTokenCode = (address: string) => {
        for (const [code, info] of Object.entries(availableTokens)) {
          if (info.contract === address) return code;
        }
        return address.substring(0, 8) + "...";
      };
      throw new Error(
        `No liquidity available for ${getTokenCode(assetIn)} → ${getTokenCode(assetOut)}. Please try a different pair or check back later.`
      );
    }

    if (
      errorStr.includes("api key") ||
      errorStr.includes("401") ||
      errorStr.includes("403")
    ) {
      throw new Error(
        "Soroswap API key is invalid or expired. Please check your API key configuration."
      );
    }

    throw new Error(`Quote fetch failed: ${errorMessage}`);
  }
};

export const buildTransaction = async (
  request: BuildRequest
): Promise<BuildResponse> => {
  const sdkNetwork = getSDKNetwork();

  try {
    const sdkQuote = request.quote._sdkQuote as
      | Record<string, unknown>
      | null
      | undefined;

    if (!sdkQuote) {
      throw new Error("No SDK quote found. Please get a new quote first.");
    }

    // Direct pool quotes (rawTrade: null) build the swap transaction against the
    // Soroswap Router contract directly, bypassing the /quote/build REST API.
    if (sdkQuote.rawTrade === null) {
      const routerAddress = sdkQuote.routerAddress as string | undefined;
      const assetIn = sdkQuote.assetIn as string;
      const assetOut = sdkQuote.assetOut as string;
      const amountIn = BigInt(sdkQuote.amountIn as string);
      const amountOutMin = BigInt(sdkQuote.otherAmountThreshold as string);
      const recipient = request.to ?? request.from;

      if (!routerAddress) {
        throw new Error(
          "Router address not found in quote. Please get a new quote."
        );
      }

      const server = new rpc.Server(rpcUrl);
      const account = await server.getAccount(request.from);
      const router = new Contract(routerAddress);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);

      const tx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase,
      })
        .addOperation(
          router.call(
            "swap_exact_tokens_for_tokens",
            nativeToScVal(amountIn, { type: "i128" }),
            nativeToScVal(amountOutMin, { type: "i128" }),
            xdr.ScVal.scvVec([
              new Address(assetIn).toScVal(),
              new Address(assetOut).toScVal(),
            ]),
            new Address(recipient).toScVal(),
            nativeToScVal(deadline, { type: "u64" })
          )
        )
        .setTimeout(30)
        .build();

      const simResult = await server.simulateTransaction(tx);
      if (!("result" in simResult)) {
        const errMsg =
          "error" in simResult ? simResult.error : "Swap simulation failed";
        throw new Error(errMsg as string);
      }

      const preparedTx = rpc.assembleTransaction(tx, simResult).build();
      return { xdr: preparedTx.toXDR() };
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("Soroswap API key not configured");
    }

    const buildUrl = `${SOROSWAP_API_URL}/quote/build?network=${sdkNetwork}`;
    const buildBody: Record<string, unknown> = {
      quote: sdkQuote,
      from: request.from,
    };
    if (request.to) {
      buildBody.to = request.to;
    }
    if (request.referralId) {
      buildBody.referralId = request.referralId;
    }

    const buildRes = await fetch(buildUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildBody, (_, v) =>
        typeof v === "bigint" ? v.toString() : v
      ),
    });

    if (buildRes.status === 428) {
      const errData = (await buildRes.json().catch(() => null)) as {
        message?: string;
        action?: string;
        actionData?: {
          xdr?: string;
          signer?: string;
          assetCode?: string;
          assetIssuer?: string;
        };
      } | null;
      const ad = errData?.actionData;
      if (
        errData?.action === "CREATE_TRUSTLINE" &&
        typeof ad?.xdr === "string" &&
        typeof ad?.signer === "string"
      ) {
        throw new TrustlineRequiredError({
          message:
            errData.message ??
            "A trustline is required before this swap can be built.",
          trustlineXdr: ad.xdr,
          signer: ad.signer,
          assetCode: ad.assetCode ?? "",
          assetIssuer: ad.assetIssuer ?? "",
        });
      }
      throw new Error(
        `Quote build failed: 428 Precondition Required. ${JSON.stringify(errData)}`
      );
    }

    if (!buildRes.ok) {
      const errorData = await buildRes.json().catch(() => ({}));
      throw new Error(
        `Quote build failed: ${buildRes.status} ${buildRes.statusText}. ${JSON.stringify(errorData)}`
      );
    }

    const buildResponse = (await buildRes.json()) as { xdr: string };
    if (!buildResponse.xdr) {
      throw new Error("No XDR returned from quote build API");
    }

    return { xdr: buildResponse.xdr };
  } catch (error) {
    if (error instanceof TrustlineRequiredError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new Error(`Failed to build transaction: ${error.message}`);
    }
    throw error;
  }
};

export const sendTransaction = async (
  request: SendRequest
): Promise<SendResponse> => {
  const soroswapSDK = getSoroswapSDK();
  const sdkNetwork = getSDKNetwork();

  try {
    const sendResponse = await soroswapSDK.send(
      request.xdr,
      request.launchtube || false,
      sdkNetwork
    );

    const sendResponseTyped = sendResponse as
      | { hash?: string; txHash?: string; transactionHash?: string }
      | null
      | undefined;
    const txHash =
      sendResponseTyped?.hash ||
      sendResponseTyped?.txHash ||
      sendResponseTyped?.transactionHash;

    if (!txHash) {
      throw new Error("Transaction hash not found in SDK response");
    }

    return { txHash };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
    throw error;
  }
};

export const addLiquidity = async (
  request: AddLiquidityRequest
): Promise<AddLiquidityResponse> => {
  const assetA = formatTokenForAPI(request.assetA);
  const assetB = formatTokenForAPI(request.assetB);

  if (!isValidContractAddress(assetA)) {
    throw new Error(
      `Invalid contract address for assetA: ${assetA}. Contract addresses must start with 'C' and be 56 characters long.`
    );
  }
  if (!isValidContractAddress(assetB)) {
    throw new Error(
      `Invalid contract address for assetB: ${assetB}. Contract addresses must start with 'C' and be 56 characters long.`
    );
  }

  const amountA = toSmallestUnit(request.amountA, 7);
  const amountB = toSmallestUnit(request.amountB, 7);

  if (amountA <= BigInt(0)) {
    throw new Error(
      `Invalid amountA: ${request.amountA}. Amount must be greater than 0.`
    );
  }
  if (amountB <= BigInt(0)) {
    throw new Error(
      `Invalid amountB: ${request.amountB}. Amount must be greater than 0.`
    );
  }

  const requestBody = {
    amountA,
    amountB,
    to: request.to,
    slippageBps: request.slippageBps || 500,
  };

  try {
    const sdk = getSoroswapSDK();
    const addLiquidityResponse = (await sdk.addLiquidity({
      assetA,
      assetB,
      amountA: requestBody.amountA,
      amountB: requestBody.amountB,
      to: requestBody.to,
      slippageBps: String(requestBody.slippageBps),
    })) as { xdr?: string };

    if (!addLiquidityResponse || typeof addLiquidityResponse !== "object") {
      throw new Error("Invalid add liquidity response from Soroswap SDK");
    }

    if (
      !addLiquidityResponse.xdr ||
      typeof addLiquidityResponse.xdr !== "string"
    ) {
      throw new Error(
        "No XDR returned from Soroswap SDK addLiquidity response"
      );
    }

    return { xdr: addLiquidityResponse.xdr };
  } catch (error) {
    if (error instanceof Error) {
      const errorMessage = error.message;

      if (errorMessage.includes("No liquidity pool found")) {
        throw error;
      }

      if (
        errorMessage.includes("No path found") ||
        errorMessage.includes("No path") ||
        errorMessage.includes("404")
      ) {
        throw new Error(
          "No liquidity pool found for this token pair. This could mean:\n" +
            "• The pool doesn't exist yet and needs to be created first\n" +
            "• The token addresses may not be correct for this network\n" +
            "• Try creating the pool first or verify pools exist at https://app.soroswap.finance"
        );
      }

      if (
        errorMessage.includes("API key") ||
        errorMessage.includes("401") ||
        errorMessage.includes("403")
      ) {
        throw new Error(
          "Soroswap API key is invalid or expired. Please check your API key configuration at https://api.soroswap.finance/login"
        );
      }

      if (
        errorMessage.includes("400") ||
        errorMessage.includes("Bad Request")
      ) {
        throw new Error(`Invalid add liquidity request (400): ${errorMessage}`);
      }

      throw error;
    }

    throw error;
  }
};

export const removeLiquidity = async (
  request: RemoveLiquidityRequest
): Promise<RemoveLiquidityResponse> => {
  const assetA = formatTokenForAPI(request.assetA);
  const assetB = formatTokenForAPI(request.assetB);

  if (!isValidContractAddress(assetA)) {
    throw new Error(
      `Invalid contract address for assetA: ${assetA}. Contract addresses must start with 'C' and be 56 characters long.`
    );
  }
  if (!isValidContractAddress(assetB)) {
    throw new Error(
      `Invalid contract address for assetB: ${assetB}. Contract addresses must start with 'C' and be 56 characters long.`
    );
  }

  const liquidity = normalizeAtomicAmount(request.liquidity, "liquidity");
  const amountA = normalizeAtomicAmount(request.amountA, "amountA");
  const amountB = normalizeAtomicAmount(request.amountB, "amountB");

  if (liquidity <= 0n) {
    throw new Error("Invalid liquidity. Amount must be greater than 0.");
  }
  if (amountA <= 0n) {
    throw new Error("Invalid amountA. Amount must be greater than 0.");
  }
  if (amountB <= 0n) {
    throw new Error("Invalid amountB. Amount must be greater than 0.");
  }

  try {
    const sdk = getSoroswapSDK();
    const removeLiquidityResponse = (await sdk.removeLiquidity({
      assetA,
      assetB,
      liquidity,
      amountA,
      amountB,
      to: request.to,
      slippageBps: String(request.slippageBps || 100),
    })) as { xdr?: string };

    if (
      !removeLiquidityResponse ||
      typeof removeLiquidityResponse !== "object"
    ) {
      throw new Error("Invalid remove liquidity response from Soroswap SDK");
    }

    if (
      !removeLiquidityResponse.xdr ||
      typeof removeLiquidityResponse.xdr !== "string"
    ) {
      throw new Error(
        "No XDR returned from Soroswap SDK removeLiquidity response"
      );
    }

    return { xdr: removeLiquidityResponse.xdr };
  } catch (error) {
    if (error instanceof Error) {
      const errorMessage = error.message;

      if (errorMessage.includes("No liquidity pool found")) {
        throw error;
      }

      if (
        errorMessage.includes("No path found") ||
        errorMessage.includes("No path") ||
        errorMessage.includes("404")
      ) {
        throw new Error(
          "No liquidity pool found for this token pair. This could mean:\n" +
            "• The pool doesn't exist yet and needs to be created first\n" +
            "• The token addresses may not be correct for this network\n" +
            "• Try creating the pool first or verify pools exist at https://app.soroswap.finance"
        );
      }

      if (
        errorMessage.includes("API key") ||
        errorMessage.includes("401") ||
        errorMessage.includes("403")
      ) {
        throw new Error(
          "Soroswap API key is invalid or expired. Please check your API key configuration at https://api.soroswap.finance/login"
        );
      }

      if (
        errorMessage.includes("400") ||
        errorMessage.includes("Bad Request")
      ) {
        throw new Error(
          `Invalid remove liquidity request (400): ${errorMessage}`
        );
      }

      throw error;
    }

    throw error;
  }
};
