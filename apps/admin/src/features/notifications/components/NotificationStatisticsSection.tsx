"use client";

import { Card, ErrorNote } from "@/components/ui/FormControls";

import { useNotificationStats } from "../hooks/useNotificationQueries";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-[#141414] p-3">
      <p className="text-xs text-white/35">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

export function NotificationStatisticsSection() {
  const stats = useNotificationStats();

  if (stats.isError) {
    return (
      <Card title="Statistics">
        <ErrorNote error={new Error("Couldn't load statistics.")} />
      </Card>
    );
  }

  if (stats.isPending) {
    return (
      <Card title="Statistics">
        <div className="h-24 animate-pulse rounded-lg bg-white/5" />
      </Card>
    );
  }

  const s = stats.data;
  const readRate =
    s.delivered > 0 ? Math.round((s.read / s.delivered) * 100) : 0;

  return (
    <div className="space-y-4">
      {s.incompleteTriggers > 0 && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-400">
          {s.incompleteTriggers} trigger
          {s.incompleteTriggers === 1 ? " is" : "s are"} configured on only one
          channel. Check the Triggers tab.
        </p>
      )}

      <Card title="Delivery">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Delivered" value={s.delivered.toLocaleString()} />
          <Stat label="Read" value={s.read.toLocaleString()} />
          <Stat label="Unread" value={s.unread.toLocaleString()} />
          <Stat label="Read rate" value={`${readRate}%`} />
        </div>
      </Card>

      <Card title="Configuration">
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat
            label="Active triggers"
            value={s.activeTriggers.toLocaleString()}
          />
          <Stat
            label="Announcements sent"
            value={s.announcementsSent.toLocaleString()}
          />
        </div>
      </Card>
    </div>
  );
}
