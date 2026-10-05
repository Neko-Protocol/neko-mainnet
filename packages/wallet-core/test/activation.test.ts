import { describe, it, expect } from "vitest";
import {
  Asset,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { assertActivationOnly } from "../src/index.js";
import {
  PASSPHRASE,
  USDC_ID,
  activationOps,
  buildTx,
  keys,
} from "./helpers.js";

function check(xdr: string, sponsor: string, user: string) {
  return () =>
    assertActivationOnly({
      xdr,
      networkPassphrase: PASSPHRASE,
      sponsor,
      user,
      allowedTrustlines: [USDC_ID],
    });
}

describe("assertActivationOnly", () => {
  it("accepts a sponsored activation", () => {
    const { sponsor, user } = keys();
    const xdr = buildTx(
      sponsor.publicKey(),
      activationOps(sponsor.publicKey(), user.publicKey())
    );
    expect(check(xdr, sponsor.publicKey(), user.publicKey())).not.toThrow();
  });

  it("accepts a trustline-only top-up (account already exists)", () => {
    const { sponsor, user } = keys();
    const ops = activationOps(sponsor.publicKey(), user.publicKey());
    const xdr = buildTx(sponsor.publicKey(), [ops[0], ops[2], ops[3]]);
    expect(check(xdr, sponsor.publicKey(), user.publicKey())).not.toThrow();
  });

  it("rejects a transaction whose source is the user", () => {
    const { sponsor, user } = keys();
    const xdr = buildTx(
      user.publicKey(),
      activationOps(sponsor.publicKey(), user.publicKey())
    );
    expect(check(xdr, sponsor.publicKey(), user.publicKey())).toThrow(
      /source must be the sponsor/
    );
  });

  it("rejects a hidden payment from the user", () => {
    const { sponsor, user } = keys();
    const ops = activationOps(sponsor.publicKey(), user.publicKey());
    const drain = Operation.payment({
      destination: Keypair.random().publicKey(),
      asset: Asset.native(),
      amount: "10",
      source: user.publicKey(),
    });
    const xdr = buildTx(sponsor.publicKey(), [ops[0], ops[1], drain, ops[3]]);
    expect(check(xdr, sponsor.publicKey(), user.publicKey())).toThrow(
      /payment is not allowed/
    );
  });

  it("rejects a trustline that is not allowlisted", () => {
    const { sponsor, user } = keys();
    const ops = activationOps(sponsor.publicKey(), user.publicKey());
    const other = Operation.changeTrust({
      asset: new Asset("SCAM", Keypair.random().publicKey()),
      source: user.publicKey(),
    });
    const xdr = buildTx(sponsor.publicKey(), [ops[0], other, ops[3]]);
    expect(check(xdr, sponsor.publicKey(), user.publicKey())).toThrow(
      /not allowed/
    );
  });

  it("rejects createAccount with a starting balance or wrong destination", () => {
    const { sponsor, user } = keys();
    const ops = activationOps(sponsor.publicKey(), user.publicKey());
    const funded = Operation.createAccount({
      destination: user.publicKey(),
      startingBalance: "5",
      source: sponsor.publicKey(),
    });
    expect(
      check(
        buildTx(sponsor.publicKey(), [ops[0], funded, ops[3]]),
        sponsor.publicKey(),
        user.publicKey()
      )
    ).toThrow(/must not move funds/);

    const elsewhere = Operation.createAccount({
      destination: Keypair.random().publicKey(),
      startingBalance: "0",
      source: sponsor.publicKey(),
    });
    expect(
      check(
        buildTx(sponsor.publicKey(), [ops[0], elsewhere, ops[3]]),
        sponsor.publicKey(),
        user.publicKey()
      )
    ).toThrow(/sponsor -> user/);
  });

  it("rejects sponsoring someone else and a missing end op", () => {
    const { sponsor, user } = keys();
    const ops = activationOps(
      sponsor.publicKey(),
      Keypair.random().publicKey()
    );
    expect(
      check(
        buildTx(sponsor.publicKey(), ops),
        sponsor.publicKey(),
        user.publicKey()
      )
    ).toThrow(/begin sponsoring the user/);

    const own = activationOps(sponsor.publicKey(), user.publicKey());
    expect(
      check(
        buildTx(sponsor.publicKey(), own.slice(0, 3)),
        sponsor.publicKey(),
        user.publicKey()
      )
    ).toThrow(/end sponsoring/);
  });

  it("rejects fee-bump envelopes", () => {
    const { sponsor, user } = keys();
    const inner = TransactionBuilder.fromXDR(
      buildTx(
        sponsor.publicKey(),
        activationOps(sponsor.publicKey(), user.publicKey())
      ),
      PASSPHRASE
    );
    inner.sign(sponsor);
    const bump = TransactionBuilder.buildFeeBumpTransaction(
      sponsor,
      "1000",
      inner as Parameters<typeof TransactionBuilder.buildFeeBumpTransaction>[2],
      PASSPHRASE
    );
    expect(check(bump.toXDR(), sponsor.publicKey(), user.publicKey())).toThrow(
      /Fee-bump/
    );
  });
});
