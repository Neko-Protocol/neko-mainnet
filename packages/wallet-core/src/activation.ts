import {
  Asset,
  FeeBumpTransaction,
  TransactionBuilder,
  type Operation,
} from "@stellar/stellar-sdk";
import { WalletCoreError } from "./errors.js";

export interface ActivationGuardParams {
  xdr: string;
  networkPassphrase: string;
  sponsor: string;
  user: string;
  allowedTrustlines?: string[];
}

function fail(reason: string): never {
  throw new WalletCoreError("NOT_ACTIVATION_TX", reason);
}

function assetId(asset: Asset): string {
  return asset.isNative()
    ? "native"
    : `${asset.getCode()}:${asset.getIssuer()}`;
}

/**
 * Throws unless the transaction is a sponsored activation and nothing else:
 *
 *   beginSponsoringFutureReserves(user)        source: sponsor
 *   createAccount(user, 0)                     source: sponsor   (optional)
 *   changeTrust(allowed asset)                 source: user      (0..n)
 *   endSponsoringFutureReserves                source: user
 *
 * The transaction source must be the sponsor, so the user's signature can
 * only authorise reserves being paid for them, never a transfer out.
 */
export function assertActivationOnly({
  xdr,
  networkPassphrase,
  sponsor,
  user,
  allowedTrustlines = [],
}: ActivationGuardParams): void {
  const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
  if (tx instanceof FeeBumpTransaction)
    fail("Fee-bump envelopes are not activations");
  if (tx.source !== sponsor) fail("Transaction source must be the sponsor");

  const ops = tx.operations as Operation[];
  if (ops.length < 2) fail("Too few operations");
  const sourceOf = (op: Operation) => op.source ?? tx.source;

  const first = ops[0];
  if (
    first.type !== "beginSponsoringFutureReserves" ||
    sourceOf(first) !== sponsor ||
    first.sponsoredId !== user
  ) {
    fail("First operation must begin sponsoring the user");
  }

  const last = ops[ops.length - 1];
  if (last.type !== "endSponsoringFutureReserves" || sourceOf(last) !== user) {
    fail("Last operation must end sponsoring from the user");
  }

  let created = false;
  for (const op of ops.slice(1, -1)) {
    if (op.type === "createAccount") {
      if (created) fail("createAccount appears twice");
      if (sourceOf(op) !== sponsor || op.destination !== user) {
        fail("createAccount must be sponsor -> user");
      }
      if (Number(op.startingBalance) !== 0) {
        fail("createAccount must not move funds");
      }
      created = true;
    } else if (op.type === "changeTrust") {
      if (sourceOf(op) !== user)
        fail("changeTrust must be sourced by the user");
      if (!(op.line instanceof Asset)) fail("Only classic asset trustlines");
      if (!allowedTrustlines.includes(assetId(op.line))) {
        fail(`Trustline ${assetId(op.line)} is not allowed`);
      }
    } else {
      fail(`Operation ${op.type} is not allowed in an activation`);
    }
  }
}
