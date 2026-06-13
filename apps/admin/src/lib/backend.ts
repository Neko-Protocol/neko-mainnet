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
