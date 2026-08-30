"use client";

import { Zap } from "lucide-react";
import { useMessages, useTriggers } from "../hooks/useMailingQueries";
import { Card, ErrorNote } from "./MailingFormControls";

/**
 * The trigger catalog is served by the backend, so this list is exactly what
 * enrollment can actually fire on, not a hand-maintained copy that can drift.
 */
export function TriggersSection() {
  const triggers = useTriggers();
  const automations = useMessages("automation");

  const activeCountFor = (triggerId: string) =>
    (automations.data ?? []).filter(
      (a) => a.trigger_type === triggerId && a.status === "active"
    ).length;

  return (
    <Card
      title="Email triggers"
      description="Events the backend can fire an automation on. Each one is wired to a real enrollment query."
    >
      {triggers.isError ? (
        <ErrorNote error={new Error("Couldn't load triggers.")} />
      ) : triggers.isPending ? (
        <div className="h-24 animate-pulse rounded-lg bg-white/5" />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {(triggers.data ?? []).map((t) => {
            const active = activeCountFor(t.id);
            return (
              <li
                key={t.id}
                className="flex gap-3 rounded-lg border border-white/5 bg-[#141414] p-3"
              >
                <span className="mt-0.5 h-fit rounded-lg bg-[#2A2A2A] p-1.5 text-white/40">
                  <Zap className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {t.label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        active > 0
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-white/5 text-white/35"
                      }`}
                    >
                      {active > 0 ? `${active} active` : "not in use"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-white/40">
                    {t.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
