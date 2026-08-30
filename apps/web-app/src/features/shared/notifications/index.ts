// Public API for the shared notifications feature (export-only barrel for
// consumers outside this feature; intra-feature imports stay deep-path).
export { NotificationCenter } from "./components/NotificationCenter";
export { NotificationPanel } from "./components/NotificationPanel";
export { NotificationBellButton } from "./components/NotificationBellButton";
export { useNotifications } from "./hooks/useNotifications";
export { useUnreadCount } from "./hooks/useUnreadCount";
export { useMarkNotificationsRead } from "./hooks/useMarkNotificationsRead";
export { useClearNotifications } from "./hooks/useClearNotifications";
export { useNotificationLiveRefresh } from "./hooks/useNotificationLiveRefresh";
export {
  notificationKeys,
  NOTIFICATIONS_QUERY_ROOT,
} from "./hooks/notificationKeys";
export type {
  AppNotification,
  NotificationCategory,
} from "./services/notifications.service";
