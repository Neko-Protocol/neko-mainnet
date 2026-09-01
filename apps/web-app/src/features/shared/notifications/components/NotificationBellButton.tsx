"use client";

import React from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useUnreadCount } from "../hooks/useUnreadCount";

interface NotificationBellButtonProps {
  open: boolean;
  onToggle: () => void;
  /** "sidebar" sits in the light wallet card; "header" sits on the dark bar. */
  variant?: "sidebar" | "header";
}

export function NotificationBellButton({
  open,
  onToggle,
  variant = "sidebar",
}: NotificationBellButtonProps) {
  const t = useTranslations("sharedNotifications");
  const { data: unread = 0 } = useUnreadCount();

  // flex-1 rather than a fixed circle: the two card buttons split the row
  // evenly so together they span the width of the address button above them.
  const base =
    variant === "sidebar"
      ? "flex flex-1 items-center justify-center rounded-full bg-[#229EDF] py-3 text-white transition-colors hover:bg-[#1e8bc9]"
      : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-white transition-colors hover:bg-white/10";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={
        unread > 0 ? t("ariaLabelWithCount", { count: unread }) : t("ariaLabel")
      }
      className={`relative cursor-pointer ${base}`}
    >
      <Bell className={variant === "sidebar" ? "h-5 w-5" : "h-4 w-4"} />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
