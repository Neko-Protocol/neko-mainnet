"use client";

import { Card, ErrorNote, StatusPill } from "@/components/ui/FormControls";
import { useNotificationMessages } from "../hooks/useNotificationQueries";

export function AnnouncementHistory() {
  const messages = useNotificationMessages("announcement");
  const rows = messages.data ?? [];

  return (
    <Card title="Sent announcements">
      {messages.isError ? (
        <ErrorNote error={new Error("Couldn't load announcements.")} />
      ) : messages.isPending ? (
        <div className="h-24 animate-pulse rounded-lg bg-white/5" />
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-white/5 bg-[#141414] px-3 py-6 text-center text-sm text-white/35">
          Nothing sent yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-xs text-white/35">
              <tr>
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Audience</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Delivered</th>
                <th className="py-2 font-medium">Sent at</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-t border-white/5">
                  <td className="py-2.5 pr-4">
                    <span className="text-white">{m.name}</span>
                    <span className="block text-xs text-white/35">
                      {m.title}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-white/50">{m.audience}</td>
                  <td className="py-2.5 pr-4">
                    <StatusPill status={m.status} />
                  </td>
                  <td className="py-2.5 pr-4 text-white/60">
                    {m.sent_count.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-white/40">
                    {m.sent_at ? new Date(m.sent_at).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
