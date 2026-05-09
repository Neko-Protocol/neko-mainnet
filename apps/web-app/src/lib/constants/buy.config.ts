/**
 * Returns the payment token for a given buy target.
 *
 * Rules (add new exceptions here — nowhere else):
 *  - Buying USDC  → pay with XLM   (can't pay for USDC with itself)
 *  - Everything else → pay with USDC
 */
export function getPaymentTokenForAsset(targetSymbol: string): string {
  if (targetSymbol === "USDC") return "XLM";
  return "USDC";
}
