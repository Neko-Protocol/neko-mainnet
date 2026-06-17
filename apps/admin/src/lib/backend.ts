export async function backendFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const baseUrl = process.env.BACKEND_INTERNAL_URL;
  const key = process.env.BACKEND_INTERNAL_KEY;
  if (!baseUrl || !key) {
    throw new Error("BACKEND_PROXY_MISCONFIGURED");
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/${path}`;
  return fetch(url, {
    ...init,
    headers: {
      "X-Internal-Key": key,
      ...(init?.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
  });
}

async function readError(res: Response): Promise<string> {
  const payload = (await res.json().catch(() => ({}))) as {
    message?: string;
    code?: string;
    error?: string;
  };
  return (
    payload.message ?? payload.error ?? payload.code ?? `HTTP ${res.status}`
  );
}

export async function backendGet<T>(path: string): Promise<T> {
  const res = await backendFetch(path);
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<T>;
}

export async function backendSend<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await backendFetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json().catch(() => ({})) as Promise<T>;
}
