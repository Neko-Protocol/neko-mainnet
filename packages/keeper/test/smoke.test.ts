import { describe, it, expect } from "vitest";
import { PACKAGE_NAME } from "../src/index.js";

describe("@neko-protocol/keeper smoke", () => {
  it("exports PACKAGE_NAME", () => {
    expect(PACKAGE_NAME).toBe("@neko-protocol/keeper");
  });
});
