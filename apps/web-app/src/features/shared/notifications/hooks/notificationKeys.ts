/**
 * Shared query keys.
 *
 * Also the list that `app/providers.tsx` excludes from the persisted cache: an
 * unread badge restored from localStorage would show a count from the last
 * session, which is worse than showing nothing until the first fetch lands.
 */
export const NOTIFICATIONS_QUERY_ROOT = "notifications";

export const notificationKeys = {
  all: [NOTIFICATIONS_QUERY_ROOT] as const,
  list: (wallet: string | null) =>
    [NOTIFICATIONS_QUERY_ROOT, "list", wallet] as const,
  unread: (wallet: string | null) =>
    [NOTIFICATIONS_QUERY_ROOT, "unread", wallet] as const,
};
