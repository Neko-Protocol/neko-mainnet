import { backendClient } from "@/lib/services/backend-client";

export type NotificationCategory = "activity" | "reward" | "system" | "alert";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  url: string | null;
  category: NotificationCategory;
  trigger_type: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationList {
  items: AppNotification[];
  unread: number;
}

/**
 * Mark-read is POSTed rather than PATCHed because the backend proxy at
 * `app/api/backend-proxy/[...path]/route.ts` only forwards GET and POST.
 */
class NotificationsService {
  async list(wallet: string): Promise<NotificationList> {
    try {
      const json = await backendClient.get<NotificationList>(
        `/v1/notifications?wallet=${encodeURIComponent(wallet)}`
      );
      return json && Array.isArray(json.items)
        ? json
        : { items: [], unread: 0 };
    } catch {
      return { items: [], unread: 0 };
    }
  }

  async unreadCount(wallet: string): Promise<number> {
    try {
      const json = await backendClient.get<{ count: number }>(
        `/v1/notifications/unread-count?wallet=${encodeURIComponent(wallet)}`
      );
      return typeof json?.count === "number" ? json.count : 0;
    } catch {
      return 0;
    }
  }

  async markRead(wallet: string, ids: string[]): Promise<void> {
    if (!ids.length) return;
    await backendClient.post("/v1/notifications/read", { wallet, ids });
  }

  async markAllRead(wallet: string): Promise<void> {
    await backendClient.post("/v1/notifications/read-all", { wallet });
  }

  /**
   * Clearing hides the notification for good. The backend soft-clears it so a
   * first-time-only trigger cannot fire again for someone who tidied the tray.
   */
  async clear(wallet: string, ids: string[]): Promise<void> {
    if (!ids.length) return;
    await backendClient.post("/v1/notifications/clear", { wallet, ids });
  }

  async clearAll(wallet: string): Promise<void> {
    await backendClient.post("/v1/notifications/clear-all", { wallet });
  }
}

export const notificationsService = new NotificationsService();
