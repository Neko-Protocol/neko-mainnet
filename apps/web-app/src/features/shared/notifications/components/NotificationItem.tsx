"use client";

import React from "react";
import Link from "next/link";
import { Bell, AlertCircle, Gift, Settings2, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type {
  AppNotification,
  NotificationCategory,
} from "@/features/shared/notifications/services/notifications.service";

const CATEGORY_ICON: Record<
  NotificationCategory,
  React.ComponentType<{ className?: string }>
> = {
  activity: Bell,
  reward: Gift,
  system: Settings2,
  alert: AlertCircle,
};

const CATEGORY_ACCENT: Record<NotificationCategory, string> = {
  activity: "bg-[#229EDF]/15 text-[#229EDF]",
  reward: "bg-emerald-400/15 text-emerald-400",
  system: "bg-white/10 text-white/60",
  alert: "bg-amber-400/15 text-amber-400",
};

interface NotificationItemProps {
  notification: AppNotification;
  onNavigate: () => void;
  /** Omitted where clearing is not offered. */
  onClear?: (id: string) => void;
}

export function NotificationItem({
  notification,
  onNavigate,
  onClear,
}: NotificationItemProps) {
  const t = useTranslations("sharedNotifications.panel");
  const format = useFormatter();
  const Icon = CATEGORY_ICON[notification.category] ?? Bell;
  const accent =
    CATEGORY_ACCENT[notification.category] ?? CATEGORY_ACCENT.activity;
  const isUnread = notification.read_at === null;

  const createdAt = new Date(notification.created_at);
  const timestamp = Number.isNaN(createdAt.getTime())
    ? null
    : format.relativeTime(createdAt, new Date());

  const content = (
    <>
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${accent}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className="flex-1 text-sm font-semibold text-white">
            {notification.title}
          </span>
          {isUnread && (
            <span
              aria-label={t("unread")}
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#229EDF]"
            />
          )}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-white/60">
          {notification.body}
        </span>
        {timestamp && (
          <span className="mt-1 block text-[11px] text-white/35">
            {timestamp}
          </span>
        )}
      </span>
    </>
  );

  // The clear button is a sibling of the link, not a child: a button inside an
  // anchor is invalid, and nesting it would make dismissing a notification also
  // navigate to it.
  const rowClass = `flex w-full gap-3 rounded-xl py-3 pl-3 text-left transition-colors ${
    isUnread ? "bg-white/[0.04]" : ""
  } hover:bg-white/[0.07]`;

  return (
    <div className="group relative flex items-start">
      {notification.url ? (
        <Link
          href={notification.url}
          onClick={onNavigate}
          className={`${rowClass} ${onClear ? "pr-9" : "pr-3"}`}
        >
          {content}
        </Link>
      ) : (
        <div className={`${rowClass} ${onClear ? "pr-9" : "pr-3"}`}>
          {content}
        </div>
      )}

      {onClear && (
        <button
          type="button"
          onClick={() => onClear(notification.id)}
          aria-label={t("clear")}
          title={t("clear")}
          className="absolute top-2.5 right-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white/30 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/10 hover:text-white focus-visible:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
