import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFrom, mockGetSupabaseAdmin } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: mockGetSupabaseAdmin,
}));

// Minimal fake matching just the .from().select/insert/delete().eq()... chain
// shape these functions actually use, queued one response per call.
function fakeAdminClient(response: unknown) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.insert = vi.fn(chain);
  builder.delete = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.single = vi.fn(() => Promise.resolve(response));
  builder.maybeSingle = vi.fn(() => Promise.resolve(response));
  builder.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(response).then(resolve);
  mockFrom.mockReturnValue(builder);
  return { from: mockFrom };
}

beforeEach(() => {
  mockFrom.mockReset();
  mockGetSupabaseAdmin.mockReset();
});

describe("createAdminSession", () => {
  it("returns the new row's id", async () => {
    mockGetSupabaseAdmin.mockReturnValue(
      fakeAdminClient({ data: { id: "session-1" }, error: null })
    );
    const { createAdminSession } = await import("./admin-session");

    await expect(createAdminSession("Admin@Example.com")).resolves.toBe(
      "session-1"
    );
    expect(mockFrom).toHaveBeenCalledWith("admin_sessions");
  });

  it("returns null when the insert fails", async () => {
    mockGetSupabaseAdmin.mockReturnValue(
      fakeAdminClient({ data: null, error: { message: "boom" } })
    );
    const { createAdminSession } = await import("./admin-session");

    await expect(createAdminSession("admin@example.com")).resolves.toBeNull();
  });

  it("returns null when Supabase env vars are missing", async () => {
    mockGetSupabaseAdmin.mockReturnValue(null);
    const { createAdminSession } = await import("./admin-session");

    await expect(createAdminSession("admin@example.com")).resolves.toBeNull();
  });
});

describe("isAdminSessionValid", () => {
  it("is false with no session id (nothing to look up)", async () => {
    const { isAdminSessionValid } = await import("./admin-session");
    await expect(isAdminSessionValid(undefined)).resolves.toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("is false when the session id doesn't exist", async () => {
    mockGetSupabaseAdmin.mockReturnValue(
      fakeAdminClient({ data: null, error: null })
    );
    const { isAdminSessionValid } = await import("./admin-session");
    await expect(isAdminSessionValid("unknown")).resolves.toBe(false);
  });

  it("is false once past the row's expires_at", async () => {
    mockGetSupabaseAdmin.mockReturnValue(
      fakeAdminClient({
        data: { expires_at: new Date(Date.now() - 1000).toISOString() },
        error: null,
      })
    );
    const { isAdminSessionValid } = await import("./admin-session");
    await expect(isAdminSessionValid("expired")).resolves.toBe(false);
  });

  it("is true before the row's expires_at", async () => {
    mockGetSupabaseAdmin.mockReturnValue(
      fakeAdminClient({
        data: { expires_at: new Date(Date.now() + 60_000).toISOString() },
        error: null,
      })
    );
    const { isAdminSessionValid } = await import("./admin-session");
    await expect(isAdminSessionValid("fresh")).resolves.toBe(true);
  });
});

describe("deleteAdminSession", () => {
  it("no-ops with no session id", async () => {
    const { deleteAdminSession } = await import("./admin-session");
    await deleteAdminSession(undefined);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("deletes the row by id", async () => {
    mockGetSupabaseAdmin.mockReturnValue(
      fakeAdminClient({ data: null, error: null })
    );
    const { deleteAdminSession } = await import("./admin-session");
    await deleteAdminSession("session-1");
    expect(mockFrom).toHaveBeenCalledWith("admin_sessions");
  });
});
