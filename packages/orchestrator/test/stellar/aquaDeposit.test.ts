import { describe, it, expect } from "vitest";
import * as aqua from "../../src/stellar/aquaDeposit.js";

describe("aquaDeposit", () => {
  it("exposes the expected functions", () => {
    expect(typeof aqua.aquaProportionalAmountB).toBe("function");
    expect(typeof aqua.reserveStroopsFromApiString).toBe("function");
  });
  it("parses API reserves to bigint", () => {
    expect(typeof aqua.reserveStroopsFromApiString("100.0000000")).toBe(
      "bigint"
    );
    expect(aqua.reserveStroopsFromApiString("100.0000000")).toBe(100n);
    expect(aqua.reserveStroopsFromApiString("")).toBe(0n);
  });
  it("computes proportional B amount", () => {
    // amountA=100, reserveA=1000, reserveB=2000 → 100*2000*101/(1000*100) = 202
    expect(aqua.aquaProportionalAmountB(100n, ["1000", "2000"])).toBe(202n);
  });
});
