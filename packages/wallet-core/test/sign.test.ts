import { describe, it, expect } from "vitest";
import {
  Keypair,
  Operation,
  TransactionBuilder,
  Asset,
} from "@stellar/stellar-sdk";
import {
  createRawHashWallet,
  signXdrWithRawSigner,
  WalletCoreError,
} from "../src/index.js";
import { createMockWallet, keypairRawHashSigner } from "../src/mock.js";
import { PASSPHRASE, buildTx } from "./helpers.js";

function paymentXdr(source: string) {
  return buildTx(source, [
    Operation.payment({
      destination: Keypair.random().publicKey(),
      asset: Asset.native(),
      amount: "1",
    }),
  ]);
}

describe("signXdrWithRawSigner", () => {
  it("adds a signature equal to a native keypair signature", async () => {
    const kp = Keypair.random();
    const xdr = paymentXdr(kp.publicKey());

    const signed = await signXdrWithRawSigner({
      xdr,
      networkPassphrase: PASSPHRASE,
      address: kp.publicKey(),
      signRawHash: keypairRawHashSigner(kp),
    });

    const native = TransactionBuilder.fromXDR(xdr, PASSPHRASE);
    native.sign(kp);
    expect(signed).toBe(native.toXDR());
  });

  it("accepts a signature without 0x prefix", async () => {
    const kp = Keypair.random();
    const signer = keypairRawHashSigner(kp);
    const signed = await signXdrWithRawSigner({
      xdr: paymentXdr(kp.publicKey()),
      networkPassphrase: PASSPHRASE,
      address: kp.publicKey(),
      signRawHash: async (h) => (await signer(h)).slice(2),
    });
    expect(
      TransactionBuilder.fromXDR(signed, PASSPHRASE).signatures
    ).toHaveLength(1);
  });

  it("rejects a signature from another key", async () => {
    const kp = Keypair.random();
    await expect(
      signXdrWithRawSigner({
        xdr: paymentXdr(kp.publicKey()),
        networkPassphrase: PASSPHRASE,
        address: kp.publicKey(),
        signRawHash: keypairRawHashSigner(Keypair.random()),
      })
    ).rejects.toMatchObject({ code: "SIGNATURE_MISMATCH" });
  });

  it("rejects malformed signatures", async () => {
    const kp = Keypair.random();
    const base = {
      xdr: paymentXdr(kp.publicKey()),
      networkPassphrase: PASSPHRASE,
      address: kp.publicKey(),
    };
    await expect(
      signXdrWithRawSigner({ ...base, signRawHash: async () => "0xabcd" })
    ).rejects.toBeInstanceOf(WalletCoreError);
    await expect(
      signXdrWithRawSigner({ ...base, signRawHash: async () => "0xzz" })
    ).rejects.toMatchObject({ code: "INVALID_SIGNATURE" });
  });

  it("passes the envelope hash as 0x hex", async () => {
    const kp = Keypair.random();
    const xdr = paymentXdr(kp.publicKey());
    let seen = "";
    const signer = keypairRawHashSigner(kp);
    await signXdrWithRawSigner({
      xdr,
      networkPassphrase: PASSPHRASE,
      address: kp.publicKey(),
      signRawHash: async (h) => ((seen = h), signer(h)),
    });
    const hash = TransactionBuilder.fromXDR(xdr, PASSPHRASE)
      .hash()
      .toString("hex");
    expect(seen).toBe(`0x${hash}`);
  });
});

describe("wallets", () => {
  it("createRawHashWallet and createMockWallet expose the SmartWallet shape", async () => {
    const mock = createMockWallet();
    expect(mock.provider).toBe("mock");
    expect(mock.kind).toBe("embedded");

    const wallet = createRawHashWallet({
      address: mock.address,
      provider: "privy",
      signRawHash: keypairRawHashSigner(mock.keypair),
    });
    const xdr = paymentXdr(wallet.address);
    expect(
      await wallet.signTransaction(xdr, { networkPassphrase: PASSPHRASE })
    ).toBe(await mock.signTransaction(xdr, { networkPassphrase: PASSPHRASE }));
  });
});
