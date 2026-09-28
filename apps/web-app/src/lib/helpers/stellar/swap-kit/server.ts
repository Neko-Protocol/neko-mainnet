import "server-only";
import { OppiaSwapServer } from "oppia-swap-kit/server";
import type { ServerQuoteRequest } from "oppia-swap-kit/server";
import { horizonUrl, rpcUrl } from "@/lib/constants/network";
import type {
  BuildRequest,
  BuildResponse,
  QuoteRequest,
  QuoteResponse,
} from "../../../types/swapTypes";
import { getSwapNetwork, getSwapTokenCatalog } from "./catalog";

/**
 * Neko's historical xBull `feePercentage` of `20_000n` used xBull's
 * 10,000,000 denominator, i.e. 20 basis points. Oppia takes basis points
 * directly, so the rate is unchanged.
 */
const REFERRAL_FEE_BPS = 20;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name} for swap routing`);
  return value;
}

/**
 * `NEXT_PUBLIC_SOROSWAP_API_KEY` is accepted for continuity with the existing
 * deployment, but the prefix is wrong for a credential: it inlines the key
 * into the client bundle for anything that reads it in a browser. Only this
 * server module reads it, and `SOROSWAP_API_KEY` should replace it.
 */
function soroswapApiKey(): string {
  const key = (
    process.env.SOROSWAP_API_KEY ?? process.env.NEXT_PUBLIC_SOROSWAP_API_KEY
  )?.trim();
  if (!key) throw new Error("Missing SOROSWAP_API_KEY for swap routing");
  return key;
}

function createSwapServer(): OppiaSwapServer {
  const secret = requireEnv("OPPIA_QUOTE_SECRET");
  if (!/^[0-9a-f]{64}$/i.test(secret)) {
    throw new Error("OPPIA_QUOTE_SECRET must be 32 random bytes as hex");
  }

  return new OppiaSwapServer({
    network: getSwapNetwork(),
    rpcUrl,
    horizonUrl,
    quoteSecret: Buffer.from(secret, "hex"),
    // Bound into every quote token; bumping it invalidates outstanding quotes.
    quoteScope: `neko-${getSwapNetwork()}-v1`,
    referral: {
      address: requireEnv("SWAP_REFERRAL_ADDRESS"),
      feeBps: REFERRAL_FEE_BPS,
      /**
       * `required: false` (re-quote without the fee rather than drop the
       * provider) is the behavior we want, but it is held back by an Oppia
       * build bug: Soroswap reports `otherAmountThreshold === amountOut` on
       * aggregator routes and applies slippage only at build, so the kit
       * rejects its own route with "Soroswap invocation weakens minimum
       * output". Requiring the referral confines Soroswap to SDEX routes,
       * which validate correctly — and SDEX covers every pair Neko can
       * currently swap. Flip this to false once that build check is fixed.
       */
      required: true,
    },
    /**
     * Soroswap aggregates soroswap/aqua/phoenix/sdex, and direct SDEX covers
     * classic order books it may miss. Aquarius is omitted because its
     * referrals need a deployed fee-collector contract, and xBull because its
     * public build endpoint rejects every request with an opaque 400 —
     * confirmed against the live endpoint, not just taken from Oppia's docs.
     */
    providers: [
      { type: "soroswap", apiKey: soroswapApiKey() },
      { type: "sdex" },
    ],
    tokens: getSwapTokenCatalog(),
  });
}

let swapServer: OppiaSwapServer | undefined;
const server = () => (swapServer ??= createSwapServer());

export async function getQuoteServer(
  request: QuoteRequest
): Promise<QuoteResponse> {
  const oppiaRequest: ServerQuoteRequest = {
    assetIn: request.assetIn,
    assetOut: request.assetOut,
    amount: request.amount,
    tradeType: request.tradeType,
    slippageBps: request.slippageBps,
    // Omitted for price cards and the simulator: the response prices the pair,
    // reports `sourceAddress: null`, and is refused by the build endpoint.
    ...(request.sourceAddress ? { sourceAddress: request.sourceAddress } : {}),
  };

  return server().getQuote(oppiaRequest);
}

export async function buildTransactionServer(
  request: BuildRequest
): Promise<BuildResponse> {
  const result = await server().buildTransaction({
    quote: request.quote,
    from: request.from,
    to: request.to ?? request.from,
  });

  return { xdr: result.xdr, swap: result.swap };
}
