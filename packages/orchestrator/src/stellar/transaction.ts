import {
  SorobanDataBuilder,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

export type SignTransactionFn = (
  xdr: string,
  options?: { networkPassphrase?: string; address?: string }
) => Promise<string | { signedTxXdr?: string }>;

export function extractSignedTxXdr(
  signed: string | { signedTxXdr?: string }
): string {
  const signedXdr =
    typeof signed === "string" ? signed : (signed.signedTxXdr ?? "");
  if (!signedXdr) {
    throw new Error("Wallet did not return a signed transaction XDR");
  }
  return signedXdr;
}

/**
 * Headroom for the inclusion fee, in stroops.
 *
 * The inclusion fee decides whether a transaction is let into the ledger at
 * all, and the SDK defaults it to BASE_FEE — the floor, with nothing above it.
 * The moment the network wants one stroop more, every submission is refused
 * with txInsufficientFee. That is what happened: 101 asked against 100
 * offered, on a transaction whose resource fee of 47,826 was never in
 * question.
 *
 * Bidding high is free. Under surge pricing Stellar charges the lowest bid
 * that made it into the ledger rather than what was offered, so this is a
 * ceiling and not a price — a hundred times the base, and still a
 * ten-thousandth of an XLM.
 */
const INCLUSION_FEE_FLOOR = 10_000n;

/**
 * Headroom above the simulated resource fee.
 *
 * A different risk from the one above, and not the one that was failing here:
 * the simulation reports the minimum for the ledger it ran on, and anything
 * that moves before the transaction lands can push the real cost past it.
 * Also free — the declared figure is a ceiling, non-refundable resources are
 * charged at what was actually used, and the refundable remainder is returned.
 */
const RESOURCE_FEE_BUFFER_BPS = 2000n;

/**
 * Re-issues an assembled Soroban transaction with room on both fee components.
 *
 * The two are carried separately on purpose: the builder adds the resource fee
 * back on top of whatever fee it is given, so handing it the total charges for
 * the work twice.
 *
 * Anything that is not an assembled Soroban transaction is returned as it
 * came. A transaction that cannot be re-issued should still be signable — this
 * is protection, not a precondition.
 */
export function withFeeHeadroom(
  xdr: string,
  networkPassphrase: string
): string {
  try {
    const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
    if (!(tx instanceof Transaction)) return xdr;

    const sorobanData = tx.toEnvelope().v1().tx().ext().value();
    if (!sorobanData) return xdr;

    const declared = sorobanData.resourceFee().toBigInt();
    if (declared <= 0n) return xdr;

    const inclusion = BigInt(tx.fee) - declared;
    if (inclusion < 0n) return xdr;

    return TransactionBuilder.cloneFrom(tx, {
      fee: (inclusion > INCLUSION_FEE_FLOOR
        ? inclusion
        : INCLUSION_FEE_FLOOR
      ).toString(),
      sorobanData: new SorobanDataBuilder(sorobanData)
        .setResourceFee(
          declared + (declared * RESOURCE_FEE_BUFFER_BPS) / 10_000n
        )
        .build(),
    })
      .build()
      .toXDR();
  } catch {
    return xdr;
  }
}
