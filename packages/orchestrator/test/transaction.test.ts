import { describe, expect, it } from "vitest";
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  nativeToScVal,
  SorobanDataBuilder,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { withFeeHeadroom } from "../src/stellar/transaction.js";

const PASSPHRASE = "Public Global Stellar Network ; September 2015";
const SOURCE = "GDCK6VGEMRV52C6UO7Q4FJDFDF5AHKA3SWTSAHJNS3QIKRW6U5L7XYMJ";
const TOKEN = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";

/** An assembled Soroban transaction declaring `resourceFee` for its work. */
function assembled(resourceFee: bigint, inclusion = BigInt(BASE_FEE)): string {
  const base = new TransactionBuilder(new Account(SOURCE, "12345"), {
    fee: inclusion.toString(),
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(
      new Contract(TOKEN).call(
        "transfer",
        new Address(SOURCE).toScVal(),
        new Address(TOKEN).toScVal(),
        nativeToScVal(1n, { type: "i128" })
      )
    )
    .setTimeout(300)
    .build();

  return TransactionBuilder.cloneFrom(base, {
    fee: inclusion.toString(),
    sorobanData: new SorobanDataBuilder().setResourceFee(resourceFee).build(),
  })
    .build()
    .toXDR();
}

const read = (x: string) => {
  const tx = TransactionBuilder.fromXDR(x, PASSPHRASE) as Transaction;
  const data = tx.toEnvelope().v1().tx().ext().value();
  return {
    fee: BigInt(tx.fee),
    resourceFee: data ? data.resourceFee().toBigInt() : 0n,
    tx,
  };
};

describe("withFeeHeadroom", () => {
  it("leaves headroom above the simulated resource fee", () => {
    const before = read(assembled(22_704n));
    const after = read(withFeeHeadroom(assembled(22_704n), PASSPHRASE));

    expect(before.resourceFee).toBe(22_704n);
    expect(after.resourceFee).toBe(27_244n); // +20%
    expect(after.resourceFee).toBeGreaterThan(before.resourceFee);
  });

  // The builder adds the resource fee on top of whatever fee it is given, so
  // handing it the total would charge for the work twice.
  // The bug: the network wanted 101 and the SDK's BASE_FEE offered 100, on a
  // transaction whose resource fee was never in question.
  it("lifts the inclusion fee off the base, which is what was failing", () => {
    const before = read(assembled(47_826n));
    const after = read(withFeeHeadroom(assembled(47_826n), PASSPHRASE));

    expect(before.fee - before.resourceFee).toBe(100n);
    expect(after.fee - after.resourceFee).toBe(10_000n);
  });

  it("covers the exact submission the network refused", () => {
    // Offered 47,926 against a required 47,927 — short by one stroop.
    const after = read(withFeeHeadroom(assembled(47_826n), PASSPHRASE));
    expect(after.fee).toBeGreaterThanOrEqual(47_826n + 101n);
  });

  // The builder adds the resource fee on top of whatever fee it is given, so
  // handing it the total would charge for the work twice.
  it("does not charge for the resources twice", () => {
    const after = read(withFeeHeadroom(assembled(22_704n), PASSPHRASE));
    expect(after.fee - after.resourceFee).toBe(10_000n);
  });

  it("leaves an inclusion fee that already exceeds the floor alone", () => {
    const after = read(
      withFeeHeadroom(assembled(22_704n, 50_000n), PASSPHRASE)
    );
    expect(after.fee - after.resourceFee).toBe(50_000n);
  });

  it("keeps the operation, its auth and the sequence", () => {
    const before = read(assembled(22_704n));
    const after = read(withFeeHeadroom(assembled(22_704n), PASSPHRASE));

    expect(after.tx.operations).toHaveLength(1);
    expect(after.tx.operations[0].type).toBe("invokeHostFunction");
    expect(after.tx.sequence).toBe(before.tx.sequence);
    expect(after.tx.signatures).toHaveLength(0);
  });

  // A transaction that cannot be re-issued must still be signable: the buffer
  // is protection, not a precondition.
  it("returns the original when there is nothing to buffer", () => {
    const classic = new TransactionBuilder(new Account(SOURCE, "1"), {
      fee: BASE_FEE,
      networkPassphrase: PASSPHRASE,
    })
      .addOperation(
        new Contract(TOKEN).call("balance", new Address(SOURCE).toScVal())
      )
      .setTimeout(30)
      .build()
      .toXDR();

    expect(withFeeHeadroom(classic, PASSPHRASE)).toBe(classic);
    expect(withFeeHeadroom("not-xdr", PASSPHRASE)).toBe("not-xdr");
    expect(withFeeHeadroom(assembled(0n), PASSPHRASE)).toBe(assembled(0n));
  });

  it("survives the drift that broke production", () => {
    // Observed: 47,823 required, then 47,927 minutes later.
    const after = read(withFeeHeadroom(assembled(47_823n), PASSPHRASE));
    expect(after.resourceFee).toBeGreaterThan(47_927n);
  });
});
