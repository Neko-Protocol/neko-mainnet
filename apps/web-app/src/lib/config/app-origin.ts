const ORIGIN_ENV_KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_VERCEL_URL",
] as const;

export function getAppOrigin(fallback: string): string {
  const configured =
    ORIGIN_ENV_KEYS.map((key) => process.env[key]?.trim()).find(Boolean) ??
    fallback;
  const withProtocol = /^https?:\/\//i.test(configured)
    ? configured
    : `https://${configured}`;

  return withProtocol.replace(/\/+$/, "");
}
