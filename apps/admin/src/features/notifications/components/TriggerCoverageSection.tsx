"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Bell,
  Loader2,
  Mail,
  Pause,
  Play,
  Trash2,
  Zap,
} from "lucide-react";
import { Card, ErrorNote } from "@/components/ui/FormControls";
import {
  useDeleteMessage,
  useSetMessageStatus,
} from "@/features/mailing/hooks/useMailingMutations";
import {
  useDeleteNotificationMessage,
  useSetNotificationMessageStatus,
} from "../hooks/useNotificationMutations";
import { useTriggerCoverage } from "../hooks/useNotificationQueries";
import { notificationKeys } from "../queryKeys";

type ChannelAction = "activate" | "pause" | "archive" | "delete";

function IconAction({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition-colors ${
        danger ? "hover:bg-red-500/25 hover:text-red-400" : "hover:bg-white/15"
      }`}
    >
      <Icon className="h-3 w-3" />
    </button>
  );
}

function ChannelChip({
  label,
  icon: Icon,
  status,
  busy,
  supported = true,
  onAction,
}: {
  label: string;
  icon: React.ElementType;
  /** null when no message backs this channel at all. */
  status: string | null;
  busy: boolean;
  /** False when this channel is deliberately unavailable for the trigger. */
  supported?: boolean;
  onAction: (action: ChannelAction) => void;
}) {
  const active = status === "active";

  // Deliberately unavailable reads as neutral, never amber: amber means
  // "someone still has to do this", and here nobody does.
  if (!supported) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-white/30">
        <Icon className="h-3 w-3" />
        {label}
        <span className="opacity-70">not available</span>
      </span>
    );
  }
  // Three states, not two. "Nothing written" and "written but not switched on"
  // used to render the same, which made a half-finished trigger look untouched.
  const tone = active
    ? "bg-emerald-500/15 text-emerald-400"
    : status
      ? "bg-amber-500/15 text-amber-400"
      : "bg-white/5 text-white/35";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full py-0.5 pl-2 pr-1 text-xs font-medium ${tone}`}
    >
      <Icon className="h-3 w-3" />
      {label}
      <span className="opacity-60">{status ?? "not set"}</span>

      {busy ? (
        <span className="inline-flex h-5 w-5 items-center justify-center">
          <Loader2 className="h-3 w-3 animate-spin" />
        </span>
      ) : (
        <span className="inline-flex items-center">
          {status && (
            <IconAction
              icon={active ? Pause : Play}
              label={
                active ? `Pause ${label} channel` : `Activate ${label} channel`
              }
              onClick={() => onAction(active ? "pause" : "activate")}
            />
          )}

          {/* Draft has no send history to lose, so it can be deleted outright.
              Paused might, and the backend refuses to delete it, so the honest
              action there is archive - which also drops it out of this view. */}
          {status === "draft" && (
            <IconAction
              icon={Trash2}
              label={`Delete ${label} message`}
              danger
              onClick={() => onAction("delete")}
            />
          )}
          {status === "paused" && (
            <IconAction
              icon={Archive}
              label={`Archive ${label} message`}
              onClick={() => onAction("archive")}
            />
          )}
        </span>
      )}
    </span>
  );
}

/**
 * Every trigger should reach people twice: once in the app and once by email.
 *
 * This is the only view that can say whether that holds, because the two
 * channels live in separate tables. It is also where each channel is switched
 * on, paused, or cleared, so a half-wired trigger can be finished or abandoned
 * without hunting for the message in a list further down the page.
 */
export function TriggerCoverageSection() {
  const coverage = useTriggerCoverage();

  const queryClient = useQueryClient();
  const setNotifStatus = useSetNotificationMessageStatus();
  const deleteNotif = useDeleteNotificationMessage();
  const setEmailStatus = useSetMessageStatus();
  const deleteEmail = useDeleteMessage();

  // The mailing mutations only invalidate the mailing tree, so an email-side
  // change would leave this matrix showing the old status until something else
  // refetched it.
  const refreshCoverage = {
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  };

  const rows = coverage.data ?? [];
  // Email-only triggers can never have both halves, so counting them here
  // would leave a warning that no amount of work clears.
  const incomplete = rows.filter(
    (r) => r.inAppSupported && r.hasNotification !== r.hasEmail
  );

  const runNotif = (id: string, action: ChannelAction) => {
    if (action === "delete") deleteNotif.mutate(id);
    else setNotifStatus.mutate({ id, action });
  };

  const runEmail = (id: string, action: ChannelAction) => {
    if (action === "delete") deleteEmail.mutate(id, refreshCoverage);
    else setEmailStatus.mutate({ id, action }, refreshCoverage);
  };

  const notifBusy = setNotifStatus.isPending || deleteNotif.isPending;
  const emailBusy = setEmailStatus.isPending || deleteEmail.isPending;

  return (
    <Card
      title="Triggers"
      description="Each trigger should fire an in-app notification and an email. Use the controls on each chip to switch a channel on, pause it, or clear it."
    >
      {coverage.isError ? (
        <ErrorNote error={new Error("Couldn't load trigger coverage.")} />
      ) : coverage.isPending ? (
        <div className="h-32 animate-pulse rounded-lg bg-white/5" />
      ) : (
        <>
          {incomplete.length > 0 && (
            <p className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
              {incomplete.length} trigger
              {incomplete.length === 1 ? " reaches" : "s reach"} people on only
              one channel.
            </p>
          )}

          <div className="mb-3 space-y-2">
            <ErrorNote error={setNotifStatus.error} />
            <ErrorNote error={deleteNotif.error} />
            <ErrorNote error={setEmailStatus.error} />
            <ErrorNote error={deleteEmail.error} />
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {rows.map((t) => (
              <li
                key={t.id}
                className="flex gap-3 rounded-lg border border-white/5 bg-[#141414] p-3"
              >
                <span className="mt-0.5 h-fit rounded-lg bg-[#2A2A2A] p-1.5 text-white/40">
                  <Zap className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-white">
                    {t.label}
                  </span>
                  <p className="mt-1 text-xs leading-relaxed text-white/40">
                    {t.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <ChannelChip
                      label="In-app"
                      icon={Bell}
                      status={t.notificationStatus}
                      busy={notifBusy}
                      supported={t.inAppSupported}
                      onAction={(action) =>
                        t.notificationMessageId &&
                        runNotif(t.notificationMessageId, action)
                      }
                    />
                    <ChannelChip
                      label="Email"
                      icon={Mail}
                      status={t.emailStatus}
                      busy={emailBusy}
                      onAction={(action) =>
                        t.emailMessageId && runEmail(t.emailMessageId, action)
                      }
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
