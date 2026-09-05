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
import { withResourceFeeBuffer } from "../src/stellar/transaction.js";

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

describe("withResourceFeeBuffer", () => {
  it("leaves headroom above the simulated resource fee", () => {
    const before = read(assembled(22_704n));
    const after = read(withResourceFeeBuffer(assembled(22_704n), PASSPHRASE));

    expect(before.resourceFee).toBe(22_704n);
    expect(after.resourceFee).toBe(27_244n); // +20%
    expect(after.resourceFee).toBeGreaterThan(before.resourceFee);
  });

  // The builder adds the resource fee on top of whatever fee it is given, so
  // handing it the total would charge for the work twice.
  it("carries the inclusion fee across without doubling it", () => {
    const after = read(withResourceFeeBuffer(assembled(22_704n), PASSPHRASE));
    expect(after.fee - after.resourceFee).toBe(BigInt(BASE_FEE));
  });

  it("keeps the operation, its auth and the sequence", () => {
    const before = read(assembled(22_704n));
    const after = read(withResourceFeeBuffer(assembled(22_704n), PASSPHRASE));

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

    expect(withResourceFeeBuffer(classic, PASSPHRASE)).toBe(classic);
    expect(withResourceFeeBuffer("not-xdr", PASSPHRASE)).toBe("not-xdr");
    expect(withResourceFeeBuffer(assembled(0n), PASSPHRASE)).toBe(
      assembled(0n)
    );
  });

  it("survives the drift that broke production", () => {
    // Observed: 47,823 required, then 47,927 minutes later.
    const after = read(withResourceFeeBuffer(assembled(47_823n), PASSPHRASE));
    expect(after.resourceFee).toBeGreaterThan(47_927n);
  });
});
