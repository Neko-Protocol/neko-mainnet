"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  Megaphone,
  Send,
  UserMinus,
  Zap,
} from "lucide-react";
import type { MailingKindStats } from "@neko/api-contracts";
import { useMailingStats } from "../hooks/useMailingQueries";
import { Card, ErrorNote } from "./MailingFormControls";

function Stat({
  icon,
  label,
  value,
  hint,
  tone = "default",
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "good" | "bad";
  isLoading?: boolean;
}) {
  const valueTone =
    tone === "good"
      ? "text-emerald-400"
      : tone === "bad" && value > 0
        ? "text-red-400"
        : "text-white";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-[#141414] p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-[#2A2A2A] p-1.5 text-white/40">
          {icon}
        </span>
        <span className="text-xs font-medium text-white/40">{label}</span>
      </div>
      {isLoading ? (
        <div className="h-8 w-20 animate-pulse rounded bg-white/10" />
      ) : (
        <div>
          <div className={`text-2xl font-bold sm:text-3xl ${valueTone}`}>
            {value.toLocaleString()}
          </div>
          {hint && <div className="mt-1 text-xs text-white/40">{hint}</div>}
        </div>
      )}
    </div>
  );
}

function DeliveryBreakdown({
  title,
  description,
  stats,
  isLoading,
}: {
  title: string;
  description: string;
  stats?: MailingKindStats;
  isLoading: boolean;
}) {
  const rows: {
    key: keyof MailingKindStats;
    label: string;
    tone: "default" | "good" | "bad";
  }[] = [
    { key: "sent", label: "Delivered", tone: "good" },
    { key: "pending", label: "Queued", tone: "default" },
    { key: "skipped", label: "Skipped", tone: "default" },
    { key: "failed", label: "Failed", tone: "bad" },
  ];

  return (
    <div className="rounded-2xl border border-white/5 bg-[#141414] p-4">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <p className="mt-1 text-xs text-white/40">{description}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {rows.map(({ key, label, tone }) => {
          const value = stats?.[key] ?? 0;
          return (
            <div key={key}>
              <dt className="text-xs text-white/35">{label}</dt>
              <dd
                className={`text-lg font-semibold ${
                  tone === "good"
                    ? "text-emerald-400"
                    : tone === "bad" && value > 0
                      ? "text-red-400"
                      : "text-white/80"
                }`}
              >
                {isLoading ? "..." : value.toLocaleString()}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export function StatisticsSection() {
  const { data, isPending, isError } = useMailingStats();

  if (isError) {
    return (
      <Card title="Statistics" description="Mailing delivery totals.">
        <ErrorNote error={new Error("Couldn't load mailing statistics.")} />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card
        title="Statistics"
        description="What has actually gone out, counted from per-recipient send records."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={<Megaphone className="h-5 w-5" />}
            label="Broadcasts sent"
            value={data?.broadcasts.messages ?? 0}
            hint="Campaigns that went out"
            isLoading={isPending}
          />
          <Stat
            icon={<Mail className="h-5 w-5" />}
            label="Mass emails delivered"
            value={data?.broadcasts.sent ?? 0}
            hint="Individual emails from broadcasts"
            tone="good"
            isLoading={isPending}
          />
          <Stat
            icon={<Zap className="h-5 w-5" />}
            label="Automation emails sent"
            value={data?.automations.sent ?? 0}
            hint={`${(data?.activeAutomations ?? 0).toLocaleString()} automation(s) active`}
            tone="good"
            isLoading={isPending}
          />
          <Stat
            icon={<Send className="h-5 w-5" />}
            label="Total emails sent"
            value={data?.totalSent ?? 0}
            hint="Broadcasts plus automations"
            isLoading={isPending}
          />
        </div>
      </Card>

      <Card
        title="Delivery breakdown"
        description="Every send lands in one of these states, so failures cannot hide inside a total."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <DeliveryBreakdown
            title="Broadcasts"
            description="One-off mass emails."
            stats={data?.broadcasts}
            isLoading={isPending}
          />
          <DeliveryBreakdown
            title="Automations"
            description="Triggered lifecycle emails."
            stats={data?.automations}
            isLoading={isPending}
          />
        </div>
      </Card>

      <Card
        title="Audience health"
        description="Context for the numbers above."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat
            icon={<UserMinus className="h-5 w-5" />}
            label="Opted out"
            value={data?.optOuts ?? 0}
            hint="Excluded from every send"
            isLoading={isPending}
          />
          <Stat
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Templates"
            value={data?.templates ?? 0}
            hint="Reusable content"
            isLoading={isPending}
          />
          <Stat
            icon={<Clock className="h-5 w-5" />}
            label="Queued now"
            value={
              (data?.broadcasts.pending ?? 0) + (data?.automations.pending ?? 0)
            }
            hint="Waiting for the next dispatch"
            isLoading={isPending}
          />
        </div>
        {(data?.broadcasts.failed ?? 0) + (data?.automations.failed ?? 0) >
          0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {(
                (data?.broadcasts.failed ?? 0) + (data?.automations.failed ?? 0)
              ).toLocaleString()}{" "}
              send(s) failed. Retry a failed broadcast from its history row.
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
