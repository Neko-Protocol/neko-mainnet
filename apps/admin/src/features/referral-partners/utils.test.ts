import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDate } from "./utils";

describe("formatDate", () => {
  it("formats a valid ISO date", () => {
    expect(formatDate("2026-01-15T00:00:00.000Z")).not.toBe("-");
  });

  it("falls back to '-' for an invalid date", () => {
    expect(formatDate("not-a-date")).toBe("-");
  });
});

// referralLink reads NEXT_PUBLIC_WEB_APP_URL once at module-load time, so
// each case re-imports the module after changing the env var rather than
// importing referralLink once at the top of the file.
describe("referralLink", () => {
  const originalEnv = process.env.NEXT_PUBLIC_WEB_APP_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_WEB_APP_URL = originalEnv;
    vi.resetModules();
  });

  it("returns null when NEXT_PUBLIC_WEB_APP_URL isn't configured", async () => {
    process.env.NEXT_PUBLIC_WEB_APP_URL = "";
    vi.resetModules();
    const { referralLink } = await import("./utils");
    expect(referralLink("ACME10")).toBeNull();
  });

  it("builds a ref link from the configured origin, trimming a trailing slash", async () => {
    process.env.NEXT_PUBLIC_WEB_APP_URL = "https://app.nekoprotocol.xyz/";
    vi.resetModules();
    const { referralLink } = await import("./utils");
    expect(referralLink("ACME10")).toBe(
      "https://app.nekoprotocol.xyz/?ref=ACME10"
    );
  });
});
