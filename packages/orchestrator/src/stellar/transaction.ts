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
