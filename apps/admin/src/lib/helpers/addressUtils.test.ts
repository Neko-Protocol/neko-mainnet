import { describe, expect, it } from "vitest";
import { truncateAddress } from "./addressUtils";

describe("truncateAddress", () => {
  it("truncates a long Stellar address to start…end", () => {
    expect(
      truncateAddress(
        "GAPNNM2YZ5KP7FCX7ENELRUEU7JZRS5ZRWWXXYYA3S6GQXXUML7HZ63M"
      )
    ).toBe("GAPN…Z63M");
  });

  it("returns the value unchanged when it's already short enough", () => {
    expect(truncateAddress("GABC1234")).toBe("GABC1234");
  });
});
