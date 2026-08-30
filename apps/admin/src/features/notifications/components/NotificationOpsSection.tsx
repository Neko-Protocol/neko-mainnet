"use client";

import { PlayCircle } from "lucide-react";
import { Button, Card, ErrorNote } from "@/components/ui/FormControls";
import { useRunNotificationEnrollment } from "../hooks/useNotificationMutations";

/**
 * Most triggers fire in-band and need no job at all. Inactivity and the low
 * balance alert are states rather than events, so they are polled hourly and
 * this button runs that pass on demand.
 *
 * Lives on its own tab, mirroring the mailing console's Jobs tab, rather than
 * trailing the Triggers tab: it is an operational escape hatch, not part of
 * wiring a trigger up.
 */
export function NotificationOpsSection() {
  const enrollment = useRunNotificationEnrollment();

  return (
    <Card
      title="Run polled triggers now"
      description="Only inactivity and the admin wallet alert are polled. Everything else fires the moment the event happens."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={enrollment.isPending}
          onClick={() => enrollment.mutate()}
        >
          <PlayCircle className="h-4 w-4" />
          {enrollment.isPending ? "Running…" : "Run now"}
        </Button>
        {enrollment.isSuccess && (
          <span className="text-sm text-white/60">
            {enrollment.data.emitted} sent
          </span>
        )}
      </div>
      <div className="mt-3">
        <ErrorNote error={enrollment.error} />
      </div>
    </Card>
  );
}
