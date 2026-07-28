import { Networks, TransactionBuilder, rpc } from "@stellar/stellar-sdk";
import { networkPassphrase, rpcUrl } from "@/lib/constants/network";
import { stellarNetwork } from "@/lib/config/stellar.config";
import type {
  BuildRequest,
  BuildResponse,
  QuoteRequest,
  QuoteResponse,
  SendRequest,
  SendResponse,
} from "../../../types/swapTypes";

async function postSwapApi<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(result.error || `Swap request failed (${response.status})`);
  }
  return result;
}

export async function getQuote(
  request: QuoteRequest
): Promise<QuoteResponse | undefined> {
  return postSwapApi<QuoteResponse>("/api/swap/quote", request);
}

export async function buildTransaction(
  request: BuildRequest
): Promise<BuildResponse> {
  return postSwapApi<BuildResponse>("/api/swap/build", request);
}

export async function sendTransaction(
  request: SendRequest
): Promise<SendResponse> {
  const server = new rpc.Server(rpcUrl, {
    allowHttp: stellarNetwork === "LOCAL",
  });
  const transaction =
    networkPassphrase === Networks.PUBLIC
      ? TransactionBuilder.fromXDR(request.xdr, Networks.PUBLIC)
      : TransactionBuilder.fromXDR(request.xdr, networkPassphrase);
  const response = await server.sendTransaction(transaction);
  if (response.status === "ERROR") {
    throw new Error("Stellar RPC rejected the swap transaction");
  }
  return { txHash: response.hash };
}
