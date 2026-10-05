export class WalletCoreError extends Error {
  constructor(
    readonly code:
      | "INVALID_SIGNATURE"
      | "SIGNATURE_MISMATCH"
      | "NOT_ACTIVATION_TX",
    message: string
  ) {
    super(message);
    this.name = "WalletCoreError";
  }
}
