export type {
  RawHashSigner,
  SignTransactionOptions,
  SmartWallet,
  WalletKind,
} from "./types.js";
export { WalletCoreError } from "./errors.js";
export { signXdrWithRawSigner, type SignWithRawSignerParams } from "./sign.js";
export {
  assertActivationOnly,
  type ActivationGuardParams,
} from "./activation.js";
export {
  createRawHashWallet,
  type RawHashWalletParams,
} from "./rawHashWallet.js";
