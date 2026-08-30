export interface BackendResult {
  ok: boolean;
  reason?: string;
}

// Thrown by fetchFromBackend when the backend call fails, so a real outage
// surfaces as a query error instead of silently rendering as zeroed-out
// stats (see AnalyticsErrorState).
export class BackendRequestError extends Error {
  constructor(
    public readonly path: string,
    public readonly reason?: string
  ) {
    super(`Backend request to "${path}" failed${reason ? `: ${reason}` : ""}`);
    this.name = "BackendRequestError";
  }
}

async function request<T extends BackendResult>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const baseUrl = process.env.BACKEND_INTERNAL_URL;
  const key = process.env.BACKEND_INTERNAL_KEY;
  if (!baseUrl || !key) {
    console.error(
      `[backend-client] missing BACKEND_INTERNAL_URL/BACKEND_INTERNAL_KEY, cannot call "${path}"`
    );
    return { ok: false, reason: "missing_backend_config" } as T;
  }

  const query =
    method === "GET" && body
      ? `?${new URLSearchParams(
          Object.entries(body).reduce<Record<string, string>>((acc, [k, v]) => {
            if (v !== undefined && v !== null && v !== "") {
              acc[k] = String(v);
            }
            return acc;
          }, {})
        )}`
      : "";

  try {
    const res = await fetch(`${baseUrl}/v1/${path}${query}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-internal-key": key,
      },
      ...(method === "POST" ? { body: JSON.stringify(body ?? {}) } : {}),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(
        `[backend-client] ${method} ${path} responded with ${res.status}`
      );
      return { ok: false, reason: `http_${res.status}` } as T;
    }
    const data = await res.json();
    return { ok: true, ...data } as T;
  } catch (err) {
    console.error(`[backend-client] ${method} ${path} threw:`, err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "network_error",
    } as T;
  }
}

export const backendClient = {
  get: <T extends BackendResult>(
    path: string,
    params?: Record<string, unknown>
  ) => request<T>("GET", path, params),
  post: <T extends BackendResult>(
    path: string,
    body?: Record<string, unknown>
  ) => request<T>("POST", path, body),
};

type RawResult = { ok: true; data: unknown } | { ok: false; reason: string };

/**
 * Like `request`, but returns the parsed JSON untouched instead of spreading
 * it into an `ok`/`reason` envelope. List endpoints return top-level arrays,
 * which spreading would silently turn into `{0: â€¦, 1: â€¦}`.
 */
async function rawRequest(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  payload?: Record<string, unknown>
): Promise<RawResult> {
  const baseUrl = process.env.BACKEND_INTERNAL_URL;
  const key = process.env.BACKEND_INTERNAL_KEY;
  if (!baseUrl || !key) {
    console.error(
      `[backend-client] missing BACKEND_INTERNAL_URL/BACKEND_INTERNAL_KEY, cannot call "${path}"`
    );
    return { ok: false, reason: "missing_backend_config" };
  }

  const query =
    method === "GET" && payload
      ? `?${new URLSearchParams(
          Object.entries(payload).reduce<Record<string, string>>(
            (acc, [k, v]) => {
              if (v !== undefined && v !== null && v !== "") {
                acc[k] = String(v);
              }
              return acc;
            },
            {}
          )
        )}`
      : "";

  try {
    const res = await fetch(`${baseUrl}/v1/${path}${query}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-internal-key": key,
      },
      ...(method === "GET" ? {} : { body: JSON.stringify(payload ?? {}) }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(
        `[backend-client] ${method} ${path} responded with ${res.status}`
      );
      // Surface the backend's own error code (e.g. AUDIENCE_EMPTY) so the
      // admin UI can show why a send was rejected rather than a bare 400.
      let reason = `http_${res.status}`;
      try {
        const body = (await res.json()) as {
          code?: unknown;
          message?: unknown;
        };
        const code =
          typeof body?.code === "string"
            ? body.code
            : typeof body?.message === "string"
              ? body.message
              : null;
        if (code) reason = code;
      } catch {
        // non-JSON error body; keep the status-based reason
      }
      return { ok: false, reason };
    }
    return { ok: true, data: await res.json() };
  } catch (err) {
    console.error(`[backend-client] ${method} ${path} threw:`, err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "network_error",
    };
  }
}

/**
 * Calls the backend and returns the response payload, or throws
 * BackendRequestError when the call failed. Callers should let this propagate
 * to TanStack Query rather than swallowing it into a default value. An admin
 * analytics panel that shows "$0" during a real outage is worse than one that
 * visibly errors.
 */
export async function fetchFromBackend<T>(
  path: string,
  params?: Record<string, unknown>
): Promise<T> {
  const result = await rawRequest("GET", path, params);
  if (!result.ok) throw new BackendRequestError(path, result.reason);
  return result.data as T;
}

/**
 * Write-side counterpart to fetchFromBackend. Throws on failure so mutations
 * surface errors in the UI instead of appearing to succeed.
 */
export async function mutateBackend<T>(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const result = await rawRequest(method, path, body);
  if (!result.ok) throw new BackendRequestError(path, result.reason);
  return result.data as T;
}
