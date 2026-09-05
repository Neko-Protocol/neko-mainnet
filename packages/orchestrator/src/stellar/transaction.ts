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
 * How much headroom to leave above the simulated resource fee.
 *
 * The simulation reports the minimum for the ledger it ran on, and the
 * assembled transaction offers exactly that. Anything that moves between
 * simulating and landing — a wallet prompt, a hardware confirmation, a
 * multisig round, ordinary rent drift — can push the real cost above it, and
 * the network answers txInsufficientFee. Observed in production twice within
 * minutes, short by 104 stroops on a fee of roughly 47,800.
 *
 * Twenty percent is chosen against that drift rather than against the amount:
 * it survives a slow signature without the ceiling becoming interesting. On a
 * typical vault operation it raises the maximum by a few thousandths of a
 * cent, and Soroban refunds the refundable part of whatever went unused.
 */
const RESOURCE_FEE_BUFFER_BPS = 2000n;

/**
 * Re-issues an assembled Soroban transaction with room above the simulated
 * resource fee.
 *
 * The inclusion fee is carried across untouched: the builder adds the resource
 * fee back on top of whatever it is given, so passing the total would charge
 * it twice.
 *
 * Anything that is not an assembled Soroban transaction is returned as it
 * came. A transaction that cannot be re-issued should still be signable — the
 * buffer is protection, not a precondition.
 */
export function withResourceFeeBuffer(
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
      fee: inclusion.toString(),
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
