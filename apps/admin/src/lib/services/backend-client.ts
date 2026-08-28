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

/**
 * Calls the backend and returns the response payload with `ok`/`reason`
 * stripped, or throws BackendRequestError when the call failed. Callers
 * should let this propagate to TanStack Query rather than swallowing it into
 * a default value — an admin analytics panel that shows "$0" during a real
 * outage is worse than one that visibly errors.
 */
export async function fetchFromBackend<T extends object>(
  path: string,
  params?: Record<string, unknown>
): Promise<T> {
  const { ok, reason, ...data } = await backendClient.get<
    BackendResult & Record<string, unknown>
  >(path, params);
  if (!ok) throw new BackendRequestError(path, reason);
  return data as T;
}
