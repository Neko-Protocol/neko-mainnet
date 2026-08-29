"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useAudiences, useBroadcasts } from "../hooks/useMailingQueries";
import {
  useDeleteBroadcast,
  useSendBroadcast,
} from "../hooks/useMailingMutations";
import { Button, Card, ErrorNote, StatusPill } from "./MailingFormControls";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export function BroadcastHistory() {
  const { data, isPending, isError } = useBroadcasts();
  const audiences = useAudiences();
  const resend = useSendBroadcast();
  const remove = useDeleteBroadcast();

  const audienceLabel = (id: string) =>
    (audiences.data ?? []).find((a) => a.id === id)?.label ?? id;

  return (
    <Card
      title="Sent broadcasts"
      description="Every mass email composed here, with its delivery result."
    >
      {isError ? (
        <ErrorNote error={new Error("Couldn't load broadcasts.")} />
      ) : isPending ? (
        <div className="h-20 animate-pulse rounded-lg bg-white/5" />
      ) : !data.length ? (
        <p className="text-sm text-white/40">No broadcasts yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs text-white/40">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Audience</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Sent / Failed</th>
                <th className="pb-2 font-medium">Sent at</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="py-3 pr-3">
                    <div className="font-medium text-white">{b.name}</div>
                    <div className="text-xs text-white/40">{b.subject}</div>
                    {b.error && (
                      <div className="mt-1 text-xs text-red-400">{b.error}</div>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-white/60">
                    {audienceLabel(b.audience)}
                  </td>
                  <td className="py-3 pr-3">
                    <StatusPill status={b.status} />
                  </td>
                  <td className="py-3 pr-3 text-white/60">
                    {b.sent_count.toLocaleString()}
                    {b.failed_count > 0 && (
                      <span className="text-red-400">
                        {" "}
                        / {b.failed_count.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-white/40">
                    {formatDate(b.sent_at)}
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-2">
                      {b.status === "failed" && (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={resend.isPending}
                          onClick={() => resend.mutate(b.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Retry
                        </Button>
                      )}
                      {b.status === "draft" && (
                        <Button
                          type="button"
                          variant="danger"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(b.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 space-y-2">
        <ErrorNote error={resend.error} />
        <ErrorNote error={remove.error} />
      </div>
    </Card>
  );
}
