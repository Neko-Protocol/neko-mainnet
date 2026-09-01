"use client";

import React from "react";
import { useNotificationLiveRefresh } from "../hooks/useNotificationLiveRefresh";
import { NotificationBellButton } from "./NotificationBellButton";
import { NotificationPanel } from "./NotificationPanel";

/**
 * Bell plus tray. The parent must be `position: relative` so the panel anchors
 * to it; both mount points (the sidebar wallet card and the mobile header)
 * already are.
 */
export function NotificationCenter({
  variant = "sidebar",
  showLabel = false,
}: {
  variant?: "sidebar" | "header";
  showLabel?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  useNotificationLiveRefresh();

  return (
    <>
      <NotificationBellButton
        open={open}
        onToggle={() => setOpen((v) => !v)}
        variant={variant}
        showLabel={showLabel}
      />
      {/* Mounted only while open so the tray's page position resets between
          visits without an effect reaching in to clear it. */}
      {open && (
        <NotificationPanel
          open
          onClose={() => setOpen(false)}
          placement={variant === "sidebar" ? "right" : "below"}
        />
      )}
    </>
  );
}
