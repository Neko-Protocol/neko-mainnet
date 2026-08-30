"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useClearNotifications } from "../hooks/useClearNotifications";
import { useMarkNotificationsRead } from "../hooks/useMarkNotificationsRead";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  /**
   * "right" flies out beside the sidebar; "below" hangs off the mobile header.
   */
  placement?: "right" | "below";
}

const PLACEMENT_CLASSES = {
  // Beside the sidebar rather than stacked on top of it: growing upward pushed
  // the tray over the wallet card and squeezed it against the top of the
  // viewport, so it never had room to show more than a couple of items.
  right: "bottom-0 left-full ml-3 w-80",
  // The header trigger is a narrow icon, so the tray needs its own width and
  // is clamped to the viewport so it cannot overflow on a small phone.
  below: "top-full right-0 mt-2 w-[min(20rem,calc(100vw-2rem))]",
} as const;

/**
 * Three at a time, paged in place. Fixing the count keeps the tray the same
 * height whether you have four notifications or forty, so the panel never
 * grows into the viewport and the page controls stay where you left them.
 */
const PAGE_SIZE = 3;

/**
 * The bell tray.
 *
 * Flies out beside the wallet card rather than rendered through ModalPortal
 * like ReferEarnModal: a notification list is a glance, and a full-screen
 * overlay would make checking it feel heavier than the thing being checked.
 * History is paged inside this same popup rather than on a route of its own,
 * for the same reason.
 */
export function NotificationPanel({
  open,
  onClose,
  placement = "right",
}: NotificationPanelProps) {
  const t = useTranslations("sharedNotifications.panel");
  const { data, isPending } = useNotifications(open);
  const { markRead } = useMarkNotificationsRead();
  const { clear, clearAll } = useClearNotifications();
  const panelRef = React.useRef<HTMLDivElement>(null);
  // Local to a single opening: the parent only mounts this while the tray is
  // open, so reopening starts at the newest page again - which is what the
  // badge was pointing at - rather than wherever the last visit stopped.
  const [page, setPage] = React.useState(0);

  const items = data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  // Clamped rather than stored blindly: clearing the last item on the last page
  // would otherwise leave the tray sitting on a page that no longer exists.
  const current = Math.min(page, pageCount - 1);
  const visible = items.slice(
    current * PAGE_SIZE,
    current * PAGE_SIZE + PAGE_SIZE
  );

  // Only what is on screen gets marked read. Clearing the badge for pages the
  // user never turned to would hide them behind a control nobody had a reason
  // to press.
  const unreadIds = React.useMemo(
    () => visible.filter((n) => n.read_at === null).map((n) => n.id),
    [visible]
  );

  // Seeing the list is what marks it read, so this runs on open rather than on
  // a per-item click. Keyed on the id list so a later arrival is also cleared.
  const unreadKey = unreadIds.join(",");
  const markReadMutate = markRead.mutate;
  React.useEffect(() => {
    if (!open || !unreadKey) return;
    markReadMutate(unreadKey.split(","));
  }, [open, unreadKey, markReadMutate]);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointerDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    // Deferred a tick so the click that opened the panel does not close it.
    const id = window.setTimeout(
      () => document.addEventListener("mousedown", onPointerDown),
      0
    );
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      window.clearTimeout(id);
    };
  }, [open, onClose]);

  if (!open) return null;

  const pagerButton =
    "flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent";

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={t("title")}
      className={`absolute z-50 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1A1A1A] shadow-2xl ${PLACEMENT_CLASSES[placement]}`}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <p className="text-sm font-semibold text-white">{t("title")}</p>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => clearAll.mutate()}
            disabled={clearAll.isPending}
            /* text-xs needs `!` here. @stellar/design-system's stylesheet is
               imported unlayered in app/layout.tsx and resets
               `button,input,optgroup,select,textarea { font-size: 100% }`;
               unlayered rules beat anything in Tailwind's `utilities` layer no
               matter the specificity, so a plain text-xs on a <button> is
               silently ignored and the label renders at the inherited 16px. */
            className="cursor-pointer text-xs! font-medium text-white/40 transition-colors hover:text-white disabled:opacity-40"
          >
            {t("clearAll")}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isPending ? (
          <div className="space-y-2 p-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-white/5"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-white/40">
            {t("empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {visible.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onNavigate={onClose}
                onClear={(id) => clear.mutate([id])}
              />
            ))}
          </div>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-white/5 px-3 py-2">
          <button
            type="button"
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            aria-label={t("previousPage")}
            className={pagerButton}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[11px] font-medium text-white/40">
            {t("pageOf", { current: current + 1, total: pageCount })}
          </span>
          <button
            type="button"
            onClick={() => setPage(current + 1)}
            disabled={current >= pageCount - 1}
            aria-label={t("nextPage")}
            className={pagerButton}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
