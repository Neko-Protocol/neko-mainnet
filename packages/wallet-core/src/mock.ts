import { Buffer } from "buffer";
import { Keypair } from "@stellar/stellar-sdk";
import { createRawHashWallet } from "./rawHashWallet.js";
import type { RawHashSigner, SmartWallet } from "./types.js";

/** These things are made for tests and scripts only. */
export function keypairRawHashSigner(keypair: Keypair): RawHashSigner {
  return async (hashHex) =>
    `0x${keypair.sign(Buffer.from(hashHex.slice(2), "hex")).toString("hex")}`;
}

export function createMockWallet(
  keypair: Keypair = Keypair.random()
): SmartWallet & {
  keypair: Keypair;
} {
  return {
    ...createRawHashWallet({
      address: keypair.publicKey(),
      provider: "mock",
      signRawHash: keypairRawHashSigner(keypair),
    }),
    keypair,
  };
}
