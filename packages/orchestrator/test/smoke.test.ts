import { describe, it, expect } from "vitest";
import { PACKAGE_NAME } from "../src/index";
describe("@neko-protocol/orchestrator", () => {
  it("exposes a package marker", () => {
    expect(PACKAGE_NAME).toBe("@neko-protocol/orchestrator");
  });
});
