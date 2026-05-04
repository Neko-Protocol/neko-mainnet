import { TransactionBuilder } from "@stellar/stellar-sdk";
import { getCurrentNetworkPassphrase } from "../network";

export interface SignRawHashParams {
  address: string;
  chainType: "stellar";
  hash: `0x${string}`;
}

export type SignRawHashFn = (
  args: SignRawHashParams
) => Promise<{ signature: string }>;

interface SignableStellarTransaction {
  hash: () => Buffer;
  addSignature: (publicKey: string, signature: string) => void;
  toXDR: () => string;
}

function hexToBase64(hex: string) {
  const normalizedHex = hex.replace(/^0x/, "");
  const bytes = normalizedHex.match(/.{1,2}/g) ?? [];
  const binary = bytes
    .map((byte) => String.fromCharCode(Number.parseInt(byte, 16)))
    .join("");

  return btoa(binary);
}

export async function signStellarTxWithPrivy(
  xdr: string,
  signerPublicKey: string,
  signRawHash: SignRawHashFn
): Promise<string> {
  const networkPassphrase = getCurrentNetworkPassphrase();
  const tx = TransactionBuilder.fromXDR(
    xdr,
    networkPassphrase
  ) as SignableStellarTransaction;
  const hash = tx.hash();
  const hashHex = `0x${hash.toString("hex")}` as const;
  const { signature } = await signRawHash({
    address: signerPublicKey,
    chainType: "stellar",
    hash: hashHex,
  });

  tx.addSignature(signerPublicKey, hexToBase64(signature));

  return tx.toXDR();
}
