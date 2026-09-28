import {
  Keypair,
  Networks,
  Transaction,
  TransactionBuilder,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";
import {
  allowHttpForSoroban,
  networkPassphrase,
  rpcUrl,
} from "@/lib/constants/network";
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

/**
 * Checks the envelope the wallet handed back before it costs a round trip.
 *
 * A signature is verified against the transaction's own hash, which is
 * derived from the network passphrase we parsed with — so this catches a
 * wallet left on another network, and a wallet signing with an account other
 * than the connected one. Both reach the network as an opaque `txBAD_AUTH`,
 * which says only that the signatures did not satisfy the account.
 */
function assertSignedForSubmission(transaction: Transaction): void {
  if (transaction.signatures.length === 0) {
    throw new Error(
      "The wallet returned an unsigned transaction. Approve the swap in your wallet, and if it uses multiple signers, co-sign it there before submitting."
    );
  }

  const source = Keypair.fromPublicKey(transaction.source);
  const hash = transaction.hash();
  const signedBySource = transaction.signatures.some((signature) => {
    try {
      return source.verify(hash, signature.signature());
    } catch {
      return false;
    }
  });

  if (signedBySource) return;

  /**
   * A signature hint is the last four bytes of the signer's public key, so it
   * separates the two causes that otherwise look identical: a signature from
   * another account never matches the hint, while the connected account
   * signing under a different network passphrase matches the hint and fails
   * only against this transaction's hash.
   */
  const sourceHint = source.rawPublicKey().subarray(-4);
  const signedByThisKey = transaction.signatures.some((signature) =>
    signature.hint().equals(sourceHint)
  );

  if (signedByThisKey) {
    throw new Error(
      `Your wallet signed for a different Stellar network. Switch it to ${networkLabel()} and try the swap again.`
    );
  }

  throw new Error(
    `Your wallet signed with a different account than the one connected here (${transaction.source}). Switch the active account in your wallet, then try the swap again.`
  );
}

function networkLabel(): string {
  if (networkPassphrase === Networks.PUBLIC) return "Stellar mainnet (public)";
  if (networkPassphrase === Networks.TESTNET) return "the Stellar testnet";
  return `the network with passphrase "${networkPassphrase}"`;
}

/** The result code is the only thing that distinguishes these failures. */
function describeRejection(
  response: rpc.Api.SendTransactionResponse,
  xdrResult: xdr.TransactionResult | undefined
): string {
  const code = xdrResult?.result().switch().name;
  switch (code) {
    case "txTooLate":
      return "The quote expired before the transaction reached the network. Request a new quote and approve it more quickly.";
    case "txBadSeq":
      return "Another transaction from this account was submitted first. Request a new quote and try again.";
    case "txInsufficientBalance":
      return "Not enough XLM to cover the transaction fee and the account reserve.";
    case "txInsufficientFee":
      return "The network fee was too low for current traffic. Request a new quote and try again.";
    case "txBadAuth":
    case "txBadAuthExtra":
      return "The network rejected the wallet's signature for this account. Check that your wallet is on the same Stellar network as the app and is signing with the connected account.";
    default:
      return `Stellar rejected the swap transaction${code ? ` (${code})` : ""}. Request a new quote and try again.`;
  }
}

export async function sendTransaction(
  request: SendRequest
): Promise<SendResponse> {
  const server = new rpc.Server(rpcUrl, {
    allowHttp: allowHttpForSoroban,
  });
  const transaction =
    networkPassphrase === Networks.PUBLIC
      ? TransactionBuilder.fromXDR(request.xdr, Networks.PUBLIC)
      : TransactionBuilder.fromXDR(request.xdr, networkPassphrase);

  if (transaction instanceof Transaction) {
    assertSignedForSubmission(transaction);
  }

  const response = await server.sendTransaction(transaction);
  if (response.status === "ERROR") {
    throw new Error(describeRejection(response, response.errorResult));
  }
  return { txHash: response.hash };
}
