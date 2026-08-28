import { describe, expect, it } from "vitest";
import { formatCompactCurrency, formatCurrency } from "./currency";

describe("formatCurrency", () => {
  it("formats a whole USD amount with two decimals", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("falls back to $0.00 for non-finite input", () => {
    expect(formatCurrency(NaN)).toBe("$0.00");
    expect(formatCurrency(Infinity)).toBe("$0.00");
  });
});

describe("formatCompactCurrency", () => {
  it("compacts large amounts", () => {
    expect(formatCompactCurrency(1_500_000)).toBe("$1.50M");
  });

  it("falls back to $0 for non-finite input", () => {
    expect(formatCompactCurrency(NaN)).toBe("$0");
  });
});
