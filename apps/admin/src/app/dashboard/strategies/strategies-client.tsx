"use client";

import { DollarSign, Layers, Loader2, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState, useTransition } from "react";
import {
  STRATEGY_TYPES,
  type StrategyStatus,
  type StrategyType,
  type StrategyWithStats,
} from "@/lib/strategies-schema";
import { createStrategy } from "@/lib/strategies";
import { getAdminEmails } from "@/lib/auth-actions";

function strategyDuration(
  createdAt: string,
  completedAt: string | null
): string {
  const start = new Date(createdAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const days = Math.max(0, Math.round((end - start) / 86_400_000));
  if (days === 0) return "< 1 day";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-1.5 rounded-full transition-[width]"
        style={{ width: `${pct}%`, backgroundColor: color }}
        role="presentation"
      />
    </div>
  );
}

function typeBadge(strategyType: StrategyType) {
  const meta = STRATEGY_TYPES.find((x) => x.id === strategyType);
  const label = meta?.label ?? strategyType;
  const color = meta?.color ?? "var(--color-neko-blue)";
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-white/15"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

function statusBadgeCls(status: StrategyStatus) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  switch (status) {
    case "active":
      return `${base} bg-neko-blue/15 text-neko-blue`;
    case "paused":
      return `${base} bg-admin-warning/15 text-admin-warning`;
    case "completed":
      return `${base} bg-neko-accent/15 text-neko-blue`;
    default:
      return `${base} bg-white/10 text-admin-subtle`;
  }
}

function initialsFromEmail(email: string | null): string {
  if (!email?.trim()) return "?";
  const char = email.trim()[0]?.toUpperCase() ?? "?";
  return char;
}

type Props = {
  strategies: StrategyWithStats[];
  stratStats: {
    total: number;
    active: number;
    paused: number;
    completed: number;
  };
  aggregates: { totalInvited: number; avgAcceptance: number };
};

const CHIP =
  "inline-flex items-center rounded-full border border-admin-border bg-white/[0.06] px-2.5 py-1 text-[11px] text-admin-muted";

export default function StrategiesClient(props: Props) {
  const router = useRouter();
  const [, startNav] = useTransition();

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { strategies, stratStats, aggregates } = props;

  const totalVolumeMoved = strategies.reduce(
    (acc, s) => acc + s.total_volume_moved,
    0
  );

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<StrategyType>("acquisition");
  const [formTarget, setFormTarget] = useState(50);
  const [formTargetVolume, setFormTargetVolume] = useState("");
  const [formAssigned, setFormAssigned] = useState("");
  const [formStatus, setFormStatus] = useState<StrategyStatus>("active");

  const { data: adminEmails = [] } = useQuery({
    queryKey: ["admin-emails"],
    queryFn: getAdminEmails,
  });

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await createStrategy({
        name: formName.trim(),
        description: formDescription.trim() || null,
        type: formType,
        target_count: formTarget,
        target_volume:
          formTargetVolume === ""
            ? 0
            : Math.max(0, Number(formTargetVolume) || 0),
        assigned_to: formAssigned.trim() || null,
        status: formStatus,
      });
      setModalOpen(false);
      setFormName("");
      setFormDescription("");
      setFormType("acquisition");
      setFormTarget(50);
      setFormTargetVolume("");
      setFormAssigned("");
      setFormStatus("active");
      if (created?.id) {
        startNav(() => router.push(`/dashboard/strategies/${created.id}`));
      }
      refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create strategy."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-page">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-klein text-3xl text-admin-text text-balance">
            Strategies
          </h1>
          <p className="text-sm text-admin-muted">
            Outreach plans and invitation pipelines
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg bg-neko-accent px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neko-navy-hover"
          onClick={() => {
            setError(null);
            setModalOpen(true);
          }}
        >
          New strategy
        </button>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-admin-border bg-admin-surface p-5 ring-1 ring-white/5">
          <div className="flex justify-between gap-2">
            <p className="text-sm font-medium text-admin-muted">
              Total Strategies
            </p>
            <Target className="size-5 text-admin-subtle" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {stratStats.total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-admin-border bg-admin-surface p-5 ring-1 ring-neko-blue/25">
          <div className="flex justify-between gap-2">
            <p className="text-sm font-medium text-admin-muted">Active</p>
            <Layers className="size-5 text-neko-blue/60" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {stratStats.active.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-admin-border bg-admin-surface p-5 ring-1 ring-white/5">
          <div className="flex justify-between gap-2">
            <p className="text-sm font-medium text-admin-muted">
              Total Invitations Sent
            </p>
            <Target className="size-5 text-white/35" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {aggregates.totalInvited.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-admin-border bg-admin-surface p-5 ring-1 ring-neko-blue/25">
          <div className="flex justify-between gap-2">
            <p className="text-sm font-medium text-admin-muted">
              Avg. Acceptance Rate
            </p>
            <TrendingUp className="size-5 text-neko-blue/55" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {`${aggregates.avgAcceptance.toFixed(
              aggregates.avgAcceptance % 1 === 0 ? 0 : 1
            )}%`}
          </p>
        </div>
        <div className="rounded-xl border border-admin-border bg-admin-surface p-5 ring-1 ring-neko-blue/20 sm:col-span-2 lg:col-span-1">
          <div className="flex justify-between gap-2">
            <p className="text-sm font-medium text-admin-muted">
              Total vol. moved
            </p>
            <DollarSign className="size-5 text-neko-blue/55" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-bold text-white tabular-nums">
            {fmtUsd(totalVolumeMoved)}
          </p>
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-admin-danger" role="alert">
          {error}
        </p>
      ) : null}

      {strategies.length === 0 ? (
        <div className="rounded-xl border border-admin-border bg-admin-surface px-6 py-16 text-center text-admin-muted">
          No strategies yet. Create one to organize invitations.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {strategies.map((s) => {
            const pctUsers =
              s.target_count > 0
                ? Math.min(100, Math.round((s.accepted / s.target_count) * 100))
                : 0;
            const pctVolume =
              s.target_volume > 0
                ? Math.min(
                    100,
                    Math.round((s.total_volume_moved / s.target_volume) * 100)
                  )
                : 0;

            const desc = s.description?.trim();

            const rateLabel =
              typeof s.acceptance_rate === "number" &&
              !Number.isNaN(s.acceptance_rate)
                ? `${s.acceptance_rate.toFixed(s.acceptance_rate % 1 === 0 ? 0 : 1)}%`
                : "—";

            return (
              <div
                key={s.id}
                className="flex flex-col gap-4 rounded-xl border border-admin-border bg-admin-surface p-5 transition-colors hover:border-white/[0.14]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="min-w-0 flex-1 text-base font-bold text-white">
                    {s.name}
                  </h2>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {typeBadge(s.type)}
                    <span className={statusBadgeCls(s.status)}>{s.status}</span>
                  </div>
                </div>

                <p className="line-clamp-1 text-sm text-white/55">
                  {desc ? (
                    desc
                  ) : (
                    <span className="italic text-admin-subtle">
                      No description
                    </span>
                  )}
                </p>

                <div className="flex items-center gap-2">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-xs font-semibold uppercase text-admin-text ring-1 ring-white/15"
                    title={s.assigned_to ?? "Unassigned"}
                  >
                    {initialsFromEmail(s.assigned_to)}
                  </span>
                  <span className="truncate text-xs text-white/55">
                    {s.assigned_to ?? "Unassigned"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                      <span className="text-xs font-medium text-admin-text">
                        {s.target_count > 0 ? (
                          <>
                            Users · {s.accepted.toLocaleString()} /{" "}
                            {s.target_count.toLocaleString()}
                          </>
                        ) : (
                          <>
                            Users
                            <span className="sr-only"> · no target set</span>
                          </>
                        )}
                      </span>
                    </div>
                    <ProgressBar
                      pct={s.target_count > 0 ? pctUsers : 0}
                      color="var(--color-neko-blue)"
                    />
                    {s.target_count === 0 ? (
                      <p className="text-[11px] text-admin-subtle">
                        No target set
                      </p>
                    ) : null}
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                      <span className="text-xs font-medium text-admin-text">
                        {s.target_volume > 0 ? (
                          <>
                            Volume ·{" "}
                            <span className="tabular-nums">
                              {fmtUsd(s.total_volume_moved)}
                            </span>{" "}
                            /{" "}
                            <span className="tabular-nums">
                              {fmtUsd(s.target_volume)}
                            </span>
                          </>
                        ) : (
                          <>
                            Volume
                            <span className="sr-only"> · no target set</span>
                          </>
                        )}
                      </span>
                    </div>
                    <ProgressBar
                      pct={s.target_volume > 0 ? pctVolume : 0}
                      color="var(--color-neko-accent)"
                    />
                    {s.target_volume === 0 ? (
                      <p className="text-[11px] text-admin-subtle">
                        No target set
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-admin-border pt-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <span className={CHIP}>
                      Total invited · {s.total_invitations.toLocaleString()}
                    </span>
                    <span className={CHIP}>
                      Pending · {s.pending.toLocaleString()}
                    </span>
                    <span className={CHIP}>Acceptance · {rateLabel}</span>
                    <span className={CHIP}>
                      Duration ·{" "}
                      {strategyDuration(s.created_at, s.completed_at)}
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/strategies/${s.id}`}
                    className="shrink-0 self-end text-sm font-medium text-neko-blue hover:underline"
                  >
                    Manage →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="strat-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-admin-border bg-admin-surface p-6 shadow-xl">
            <h2
              id="strat-modal-title"
              className="text-lg font-semibold text-white"
            >
              New strategy
            </h2>
            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="strat-name"
                  className="block text-xs font-medium text-admin-muted"
                >
                  Name<span className="text-admin-danger">*</span>
                </label>
                <input
                  id="strat-name"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-admin-border bg-admin-canvas px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent placeholder:text-white/35 focus:border-neko-blue/50 focus:ring-neko-blue/25"
                  placeholder='e.g. "VIP Partner Q2"'
                />
              </div>

              <div>
                <label
                  htmlFor="strat-desc"
                  className="block text-xs font-medium text-admin-muted"
                >
                  Description
                </label>
                <textarea
                  id="strat-desc"
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="mt-1 w-full resize-y rounded-xl border border-admin-border bg-admin-canvas px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent placeholder:text-white/35 focus:border-neko-blue/50 focus:ring-neko-blue/25"
                  placeholder="Outreach objective and audience"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-admin-muted">
                  Type
                </p>
                <div className="flex flex-wrap gap-2">
                  {STRATEGY_TYPES.map((t) => {
                    const sel = formType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFormType(t.id)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                          sel
                            ? "border-neko-blue text-white shadow-[inset_0_0_0_1px_rgba(34,158,223,0.35)]"
                            : "border-admin-border text-admin-muted hover:border-white/20"
                        }`}
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: t.color }}
                          aria-hidden
                        />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="strat-target-users"
                    className="block text-xs font-medium text-admin-muted"
                  >
                    Target users
                  </label>
                  <input
                    id="strat-target-users"
                    type="number"
                    min={0}
                    value={formTarget}
                    onChange={(e) => setFormTarget(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-xl border border-admin-border bg-admin-canvas px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-neko-blue/50 focus:ring-neko-blue/25"
                  />
                </div>
                <div>
                  <label
                    htmlFor="strat-target-volume"
                    className="block text-xs font-medium text-admin-muted"
                  >
                    Target volume (USD)
                  </label>
                  <input
                    id="strat-target-volume"
                    type="number"
                    min={0}
                    step="any"
                    value={formTargetVolume}
                    onChange={(e) => setFormTargetVolume(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-admin-border bg-admin-canvas px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-neko-blue/50 focus:ring-neko-blue/25"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="strat-assigned"
                  className="block text-xs font-medium text-admin-muted"
                >
                  Assigned to
                </label>
                <select
                  id="strat-assigned"
                  value={formAssigned}
                  onChange={(e) => setFormAssigned(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-admin-border bg-admin-canvas px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-neko-blue/50 focus:ring-neko-blue/25"
                >
                  <option value="">Unassigned</option>
                  {adminEmails.map((em) => (
                    <option key={em} value={em}>
                      {em}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="strat-status"
                  className="block text-xs font-medium text-admin-muted"
                >
                  Status
                </label>
                <select
                  id="strat-status"
                  value={formStatus}
                  onChange={(e) =>
                    setFormStatus(e.target.value as StrategyStatus)
                  }
                  className="mt-1 w-full rounded-xl border border-admin-border bg-admin-canvas px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-neko-blue/50 focus:ring-neko-blue/25"
                >
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="completed">completed</option>
                </select>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-xl border border-admin-border px-4 py-2 text-sm font-medium text-admin-muted hover:bg-white/5"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-neko-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-neko-navy-hover disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Creating…
                    </>
                  ) : (
                    "Create strategy"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
