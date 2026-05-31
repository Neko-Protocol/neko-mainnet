import { describe, it, expect } from "vitest";
import * as amount from "../../src/stellar/amount.js";

describe("amount helpers", () => {
  it("exports the expected helpers", () => {
    expect(typeof amount.applySlippageBps).toBe("function");
    expect(typeof amount.mulDivCeil).toBe("function");
    expect(typeof amount.mulDivFloor).toBe("function");
    expect(typeof amount.decimalToAtomic).toBe("function");
    expect(typeof amount.atomicToDecimal).toBe("function");
  });
  it("applySlippageBps subtracts bps", () => {
    expect(amount.applySlippageBps(10_000n, 100)).toBe(9_900n);
  });
  it("mulDivFloor rounds down", () => {
    expect(amount.mulDivFloor(7n, 3n, 2n)).toBe(10n);
  });
  it("mulDivCeil rounds up", () => {
    expect(amount.mulDivCeil(7n, 3n, 2n)).toBe(11n);
  });
  it("decimalToAtomic converts to bigint stroops", () => {
    expect(amount.decimalToAtomic("1", 7)).toBe(10_000_000n);
    expect(amount.decimalToAtomic("0.5", 7)).toBe(5_000_000n);
  });
  it("atomicToDecimal converts back to string", () => {
    expect(amount.atomicToDecimal(10_000_000n, 7)).toBe("1");
    expect(amount.atomicToDecimal(5_000_000n, 7)).toBe("0.5");
  });
});
