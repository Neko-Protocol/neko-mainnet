import { Buffer } from "buffer";
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { WalletCoreError } from "./errors.js";
import type { RawHashSigner } from "./types.js";

export interface SignWithRawSignerParams {
  xdr: string;
  networkPassphrase: string;
  address: string;
  signRawHash: RawHashSigner;
}

function hexToBuffer(hex: string): Buffer {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new WalletCoreError("INVALID_SIGNATURE", "Signature is not hex");
  }
  return Buffer.from(clean, "hex");
}

export async function signXdrWithRawSigner({
  xdr,
  networkPassphrase,
  address,
  signRawHash,
}: SignWithRawSignerParams): Promise<string> {
  const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
  const hash = tx.hash();
  const signature = hexToBuffer(await signRawHash(`0x${hash.toString("hex")}`));
  if (signature.length !== 64) {
    throw new WalletCoreError(
      "INVALID_SIGNATURE",
      `Expected a 64-byte ed25519 signature, got ${signature.length} bytes`
    );
  }
  if (!Keypair.fromPublicKey(address).verify(hash, signature)) {
    throw new WalletCoreError(
      "SIGNATURE_MISMATCH",
      "Signature does not match the wallet address"
    );
  }
  tx.addSignature(address, signature.toString("base64"));
  return tx.toXDR();
}
