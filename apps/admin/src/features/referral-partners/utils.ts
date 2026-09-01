const WEB_APP_URL = process.env.NEXT_PUBLIC_WEB_APP_URL?.replace(/\/$/, "");

/** null when NEXT_PUBLIC_WEB_APP_URL isn't configured, so the UI can say so
 * instead of copying a broken relative link. */
export function referralLink(code: string): string | null {
  return WEB_APP_URL ? `${WEB_APP_URL}/?ref=${code}` : null;
}

export function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}
