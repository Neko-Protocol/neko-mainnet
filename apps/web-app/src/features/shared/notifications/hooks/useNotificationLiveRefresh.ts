"use client";

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AUDIT_LOGGED_EVENT } from "@/lib/services/audit.service";
import { notificationKeys } from "./notificationKeys";

/**
 * Makes the badge light up the moment a trigger fires, rather than up to a
 * poll interval later.
 *
 * The backend writes the notification in-band with the audit entry that caused
 * it, so the row is already there when `auditService.log()` resolves. Listening
 * for that is as close to a push as this app can get: the `notifications` table
 * has RLS on with no public policies, so the browser's anon Supabase client
 * cannot subscribe to realtime changes on it.
 *
 * The poll in `useUnreadCount` still covers what no local action produces -
 * a referral someone else confirmed, or the hourly inactivity pass.
 */
export function useNotificationLiveRefresh() {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    };
    window.addEventListener(AUDIT_LOGGED_EVENT, refresh);
    return () => window.removeEventListener(AUDIT_LOGGED_EVENT, refresh);
  }, [queryClient]);
}
