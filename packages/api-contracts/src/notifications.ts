/**
 * Shared contracts for in-app notifications.
 *
 * The second delivery channel next to email. Trigger ids are deliberately the
 * same as `MAILING_TRIGGER_IDS`, because one event drives both channels; the
 * admin console pairs them per trigger. Audience ids are reused from
 * `mailing.ts` rather than redeclared.
 */

import type { MailingAudienceId } from "./mailing.js";

export const NOTIFICATION_TRIGGER_IDS = [
  "signup",
  "first_deposit",
  "swap_completed",
  "inactivity",
  "referral_confirmed",
  "admin_wallet_low_balance",
] as const;

export type NotificationTriggerId = (typeof NOTIFICATION_TRIGGER_IDS)[number];

/** Drives the icon and accent colour of an item in the bell panel. */
export const NOTIFICATION_CATEGORIES = [
  "activity",
  "reward",
  "system",
  "alert",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationMessageKind = "trigger" | "announcement";

export type NotificationMessageStatus =
  | "draft"
  | "active"
  | "paused"
  | "archived"
  | "sent";

/** Admin-authored content: either bound to a trigger, or pushed by hand. */
export interface NotificationMessage {
  id: string;
  kind: NotificationMessageKind;
  name: string;
  title: string;
  body: string;
  url: string | null;
  category: NotificationCategory;
  audience: MailingAudienceId;
  trigger_type: NotificationTriggerId | null;
  trigger_params: Record<string, unknown>;
  status: NotificationMessageStatus;
  sent_count: number;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  created_by: string | null;
}

/** One delivered item, as the web app renders it. */
export interface Notification {
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
  items: Notification[];
  unread: number;
}

export interface NotificationUnreadCount {
  count: number;
}

/**
 * Per-trigger channel coverage. Both flags must be true for a trigger to be
 * fully wired, which is what the admin Triggers tab surfaces.
 */
export interface NotificationTriggerCoverage {
  id: NotificationTriggerId;
  label: string;
  description: string;
  /** An active `notification_messages` row exists for this trigger. */
  hasNotification: boolean;
  /** An active `mailing_messages` automation exists for this trigger. */
  hasEmail: boolean;
  notificationMessageId: string | null;
  emailMessageId: string | null;
  /**
   * Status of the message backing each channel, or null when none exists.
   *
   * Reported separately from the `has*` flags so the console can tell "nothing
   * written yet" apart from "written but sitting in draft" - the two look
   * identical if you only ask whether an active row exists, and the second one
   * is a job half done rather than a job not started.
   */
  notificationStatus: string | null;
  emailStatus: string | null;
  /**
   * False for triggers that are deliberately email-only, so the console can
   * show "email only" rather than an amber "missing in-app channel" for a gap
   * that is intentional. Such triggers are excluded from the incomplete count.
   */
  inAppSupported: boolean;
  /** `{{placeholders}}` this trigger substitutes into the title and body. */
  placeholders: string[];
}

export interface NotificationStats {
  /** Delivered rows across every message. */
  delivered: number;
  read: number;
  unread: number;
  /** Trigger messages currently active. */
  activeTriggers: number;
  announcementsSent: number;
  /** Triggers with an active notification but no active email, or vice versa. */
  incompleteTriggers: number;
}
