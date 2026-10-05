/**
 * Provider-agnostic wallet contract. Every way a Neko user can hold a Stellar key
 */
export type WalletKind = "embedded" | "external";

export interface SignTransactionOptions {
  networkPassphrase: string;
}

export interface SmartWallet {
  readonly address: string;
  readonly kind: WalletKind;
  readonly provider: string;
  signTransaction(
    xdr: string,
    options: SignTransactionOptions
  ): Promise<string>;
}

export type RawHashSigner = (hashHex: `0x${string}`) => Promise<string>;
