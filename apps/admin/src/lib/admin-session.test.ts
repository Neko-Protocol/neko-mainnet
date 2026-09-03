import { describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  isAdminSessionExpired,
} from "./admin-session";

describe("isAdminSessionExpired", () => {
  it("treats a missing cookie as expired", () => {
    expect(isAdminSessionExpired(undefined)).toBe(true);
  });

  it("treats a non-numeric value as expired", () => {
    expect(isAdminSessionExpired("not-a-timestamp")).toBe(true);
  });

  it("is not expired right after login", () => {
    expect(isAdminSessionExpired(Date.now().toString())).toBe(false);
  });

  it("is not expired just under the cap", () => {
    const startedAt =
      Date.now() - (ADMIN_SESSION_MAX_AGE_SECONDS * 1000 - 5000);
    expect(isAdminSessionExpired(startedAt.toString())).toBe(false);
  });

  it("is expired once past the cap, even if the cookie's own expiry was tampered with", () => {
    const startedAt =
      Date.now() - (ADMIN_SESSION_MAX_AGE_SECONDS * 1000 + 5000);
    expect(isAdminSessionExpired(startedAt.toString())).toBe(true);
  });
});
