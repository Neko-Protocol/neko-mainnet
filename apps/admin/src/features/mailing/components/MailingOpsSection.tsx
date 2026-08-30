"use client";

import { PlayCircle, Send } from "lucide-react";
import { useRunDispatch, useRunEnrollment } from "../hooks/useMailingMutations";
import { Button, Card, ErrorNote } from "./MailingFormControls";

/**
 * Manual triggers for the two mailing crons. Useful for verifying an
 * automation end-to-end without waiting up to 15 minutes for the schedule.
 */
export function MailingOpsSection() {
  const enrollment = useRunEnrollment();
  const dispatch = useRunDispatch();

  return (
    <Card
      title="Run jobs now"
      description="Enrollment finds who qualifies; dispatch sends what's already due. Both also run on a schedule."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={enrollment.isPending}
          onClick={() => enrollment.mutate()}
        >
          <PlayCircle className="h-4 w-4" />
          {enrollment.isPending ? "Running…" : "Run enrollment"}
        </Button>
        {enrollment.isSuccess && (
          <span className="text-sm text-white/60">
            {enrollment.data.automationsProcessed} automations ·{" "}
            {enrollment.data.enrolled} enrolled
          </span>
        )}

        <Button
          type="button"
          variant="secondary"
          disabled={dispatch.isPending}
          onClick={() => dispatch.mutate()}
        >
          <Send className="h-4 w-4" />
          {dispatch.isPending ? "Running…" : "Run dispatch"}
        </Button>
        {dispatch.isSuccess && (
          <span className="text-sm text-white/60">
            {dispatch.data.sent} sent · {dispatch.data.skipped} skipped ·{" "}
            {dispatch.data.failed} failed
          </span>
        )}
      </div>
      <div className="mt-3 space-y-2">
        <ErrorNote error={enrollment.error} />
        <ErrorNote error={dispatch.error} />
      </div>
    </Card>
  );
}
