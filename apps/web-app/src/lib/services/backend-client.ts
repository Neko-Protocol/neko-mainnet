export const backendBaseUrl = "/api/backend-proxy";

export interface BackendErrorBody {
  code?: string;
  message?: string;
  traceId?: string;
  details?: unknown;
}

export class BackendError extends Error {
  readonly status: number;
  readonly code: string;
  readonly traceId?: string;
  readonly details?: unknown;

  constructor(status: number, body: BackendErrorBody, fallbackMessage: string) {
    super(body.message ?? fallbackMessage);
    this.name = "BackendError";
    this.status = status;
    this.code = body.code ?? "UNKNOWN_ERROR";
    this.traceId = body.traceId;
    this.details = body.details;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

async function request<T>(
  path: string,
  { method = "GET", body, signal }: RequestOptions = {}
): Promise<T> {
  const url = `${backendBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
    signal,
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);

  if (!res.ok) {
    let errorBody: BackendErrorBody = {};
    try {
      errorBody = (await res.json()) as BackendErrorBody;
    } catch {
      errorBody = {};
    }
    throw new BackendError(
      res.status,
      errorBody,
      `Request to ${path} failed with status ${res.status}`
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export const backendClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(
    path: string,
    body: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ) => request<T>(path, { ...options, method: "POST", body }),
};
