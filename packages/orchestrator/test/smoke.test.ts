import { describe, it, expect } from "vitest";
import { PACKAGE_NAME } from "../src/index";
describe("@neko/orchestrator", () => {
  it("exposes a package marker", () => {
    expect(PACKAGE_NAME).toBe("@neko/orchestrator");
  });
});
