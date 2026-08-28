import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BackendRequestError,
  backendClient,
  fetchFromBackend,
} from "./backend-client";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe("backendClient / fetchFromBackend", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.BACKEND_INTERNAL_URL = "http://backend.test";
    process.env.BACKEND_INTERNAL_KEY = "test-key";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("returns the unwrapped payload when the backend responds ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ tvlUsd: 100 }))
    );

    const data = await fetchFromBackend<{ tvlUsd: number }>(
      "admin-analytics/overview"
    );
    expect(data).toEqual({ tvlUsd: 100 });
  });

  it("throws BackendRequestError instead of silently defaulting when the backend returns a non-ok HTTP status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({}, false, 500))
    );

    await expect(
      fetchFromBackend<{ tvlUsd: number }>("admin-analytics/overview")
    ).rejects.toThrow(BackendRequestError);
    expect(console.error).toHaveBeenCalled();
  });

  it("throws BackendRequestError when the fetch call itself throws (network failure)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED"))
    );

    await expect(
      fetchFromBackend<{ tvlUsd: number }>("admin-analytics/overview")
    ).rejects.toThrow(BackendRequestError);
  });

  it("throws BackendRequestError (missing_backend_config) when env vars are absent, without ever calling fetch", async () => {
    delete process.env.BACKEND_INTERNAL_URL;
    delete process.env.BACKEND_INTERNAL_KEY;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      fetchFromBackend<{ tvlUsd: number }>("admin-analytics/overview")
    ).rejects.toThrow(/missing_backend_config/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("backendClient.get still returns { ok: false } directly for callers that want to handle failure themselves", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({}, false, 404))
    );

    const result = await backendClient.get<{ ok: boolean; reason?: string }>(
      "some/path"
    );
    expect(result).toEqual({ ok: false, reason: "http_404" });
  });
});
