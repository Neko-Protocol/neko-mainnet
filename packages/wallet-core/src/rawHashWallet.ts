import { signXdrWithRawSigner } from "./sign.js";
import type { RawHashSigner, SmartWallet, WalletKind } from "./types.js";

export interface RawHashWalletParams {
  address: string;
  provider: string;
  kind?: WalletKind;
  signRawHash: RawHashSigner;
}

/**
 * Builds a SmartWallet from any raw-hash signer. The Privy web and Expo adapters are this call with their own `signRawHash` bound to the address.
 */
export function createRawHashWallet({
  address,
  provider,
  kind = "embedded",
  signRawHash,
}: RawHashWalletParams): SmartWallet {
  return {
    address,
    kind,
    provider,
    signTransaction: (xdr, { networkPassphrase }) =>
      signXdrWithRawSigner({ xdr, networkPassphrase, address, signRawHash }),
  };
}
