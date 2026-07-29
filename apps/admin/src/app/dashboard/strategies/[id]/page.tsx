"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Loader2, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";
import type { Invitation } from "@/lib/invitations-schema";
import {
  INVITATION_TYPES,
  type InvitationType,
} from "@/lib/invitations-schema";
import {
  STRATEGY_TYPES,
  type Strategy,
  type StrategyStatus,
  type StrategyType,
} from "@/lib/strategies-schema";
import {
  getStrategy,
  getStrategyRealVolumeUsd,
  updateStrategy,
} from "@/lib/strategies";
import {
  acceptInvitation,
  createStrategyInvitation,
  deleteInvitation,
  listStrategyInvitations,
} from "@/lib/invitations";
import { getAdminEmails } from "@/lib/auth-actions";

const ACTIVITY_OPTIONS = [
  { value: "lend_deposit", label: "Lent / Deposited" },
  { value: "lend_withdraw", label: "Withdrew from lending" },
  { value: "borrow_deposit", label: "Borrowed" },
  { value: "borrow_withdraw", label: "Repaid borrow" },
  { value: "swap", label: "Swapped" },
  { value: "on_ramp", label: "On-ramped (funded)" },
  { value: "off_ramp", label: "Off-ramped" },
  { value: "vaults_deposit", label: "Deposited into vault" },
  { value: "vaults_withdraw", label: "Withdrew from vault" },
  { value: "pool_repay", label: "Repaid pool" },
  { value: "pool_claim_rewards", label: "Claimed rewards" },
] as const;

function relativeFromExpiry(iso: string): string {
  const roundedDays = Math.round(
    (new Date(iso).getTime() - Date.now()) / 86_400_000
  );
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  return rtf.format(roundedDays, "day");
}

function stratTypeBadge(strategyType: StrategyType) {
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

function stratStatusBadgeCls(status: StrategyStatus) {
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

function invTypeBadge(type: InvitationType) {
  const meta = INVITATION_TYPES.find((x) => x.id === type);
  const label = meta?.label ?? type;
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

function invStatusBadge(status: Invitation["status"]) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  switch (status) {
    case "pending":
      return `${base} bg-yellow-500/15 text-yellow-400`;
    case "accepted":
      return `${base} bg-neko-blue/15 text-neko-blue`;
    case "expired":
      return `${base} bg-white/10 text-admin-subtle`;
    default:
      return `${base} bg-white/10 text-admin-subtle`;
  }
}

function truncateActivityNotes(s: string | null): string {
  if (!s) return "—";
  const match = ACTIVITY_OPTIONS.find((o) => o.value === s);
  return match ? match.label : s;
}

function formatVolumeUsd(amount: number | null): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

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

export default function StrategyDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>("");

  const [editOpen, setEditOpen] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [eName, setEName] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eType, setEType] = useState<StrategyType>("acquisition");
  const [eTarget, setETarget] = useState(0);
  const [eTargetVolume, setETargetVolume] = useState("");
  const [eAssigned, setEAssigned] = useState("");
  const [eStatus, setEStatus] = useState<StrategyStatus>("active");
  const [closingStrategy, setClosingStrategy] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formType, setFormType] = useState<InvitationType>("user");
  const [formAssigned, setFormAssigned] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formExpiresDays, setFormExpiresDays] = useState<7 | 14 | 30>(7);
  const [submitInvite, setSubmitInvite] = useState(false);

  const [acceptingInvitation, setAcceptingInvitation] =
    useState<Invitation | null>(null);
  const [acceptedNotes, setAcceptedNotes] = useState("");
  const [volumeMoved, setVolumeMoved] = useState("");
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [markedAcceptedBanner, setMarkedAcceptedBanner] = useState<
    string | null
  >(null);

  const [realTvl, setRealTvl] = useState<number | null>(null);
  const [realTvlLoading, setRealTvlLoading] = useState(false);

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [s, invs] = await Promise.all([
        getStrategy(id),
        listStrategyInvitations(id),
      ]);
      setStrategy(s);
      setInvitations(Array.isArray(invs) ? invs : []);
      setRealTvlLoading(true);
      getStrategyRealVolumeUsd(id)
        .then((v) => setRealTvl(v))
        .catch(() => setRealTvl(null))
        .finally(() => setRealTvlLoading(false));
    } catch {
      setStrategy(null);
      setInvitations([]);
      setError("Could not load strategy.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    startTransition(() => {
      void loadAll();
    });
  }, [loadAll]);

  const { data: adminEmails = [] } = useQuery({
    queryKey: ["admin-emails"],
    queryFn: getAdminEmails,
  });

  useEffect(() => {
    if (!markedAcceptedBanner) return;
    const t = window.setTimeout(() => setMarkedAcceptedBanner(null), 4000);
    return () => window.clearTimeout(t);
  }, [markedAcceptedBanner]);

  const totals = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let expired = 0;
    for (const inv of invitations) {
      if (inv.status === "pending") pending += 1;
      else if (inv.status === "accepted") accepted += 1;
      else if (inv.status === "expired") expired += 1;
    }
    const total = invitations.length;
    const acceptanceRate =
      total === 0 ? 0 : Math.round((accepted / total) * 1000) / 10;
    return { total, pending, accepted, expired, acceptanceRate };
  }, [invitations]);

  const displayed = useMemo(() => {
    if (
      filterStatus !== "pending" &&
      filterStatus !== "accepted" &&
      filterStatus !== "expired"
    ) {
      return invitations;
    }
    return invitations.filter((i) => i.status === filterStatus);
  }, [invitations, filterStatus]);

  const totalVolumeMoved = useMemo(() => {
    return invitations.reduce((sum, inv) => {
      if (inv.status === "accepted" && inv.volume_moved != null) {
        return sum + inv.volume_moved;
      }
      return sum;
    }, 0);
  }, [invitations]);

  const pctTarget =
    strategy && strategy.target_count > 0
      ? Math.min(
          100,
          Math.round((totals.accepted / strategy.target_count) * 100)
        )
      : 0;

  const pctVolume =
    strategy && strategy.target_volume > 0
      ? Math.min(
          100,
          Math.round((totalVolumeMoved / strategy.target_volume) * 100)
        )
      : 0;

  let progressTone: "strong" | "medium" | "warning" = "warning";
  if (pctTarget > 80) progressTone = "strong";
  else if (pctTarget >= 40) progressTone = "medium";

  const progressBg =
    progressTone === "strong"
      ? "bg-neko-blue"
      : progressTone === "medium"
        ? "bg-neko-accent"
        : "bg-amber-400";

  async function handlePatchStrategy(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !strategy) return;
    setSubmittingEdit(true);
    try {
      await updateStrategy(id, {
        name: eName.trim(),
        description: eDesc.trim() || null,
        type: eType,
        target_count: eTarget,
        target_volume:
          eTargetVolume === "" ? 0 : Math.max(0, Number(eTargetVolume) || 0),
        assigned_to: eAssigned.trim() || null,
        status: eStatus,
      });
      setEditOpen(false);
      await loadAll();
      setError(null);
    } catch {
      setError("Could not update strategy.");
    } finally {
      setSubmittingEdit(false);
    }
  }

  async function handleCloseStrategy() {
    if (!strategy) return;
    const ok = window.confirm(
      "Mark this strategy as completed? This will record the closing time."
    );
    if (!ok) return;
    setClosingStrategy(true);
    try {
      await updateStrategy(id, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      await loadAll();
    } catch {
      setError("Could not close strategy.");
    } finally {
      setClosingStrategy(false);
    }
  }

  async function handleAddInvitation(ev: React.FormEvent) {
    ev.preventDefault();
    if (!id) return;
    setSubmitInvite(true);
    try {
      await createStrategyInvitation(id, {
        email: formEmail.trim(),
        type: formType,
        assigned_to: formAssigned.trim() || undefined,
        notes: formNotes.trim() || undefined,
        expires_days: formExpiresDays,
      });
      setInviteOpen(false);
      setFormEmail("");
      setFormType("user");
      setFormAssigned("");
      setFormNotes("");
      setFormExpiresDays(7);
      setError(null);
      await loadAll();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send invitation."
      );
    } finally {
      setSubmitInvite(false);
    }
  }

  async function handleDeleteInvitation(inv: Invitation) {
    const ok =
      typeof window !== "undefined" &&
      window.confirm(`Delete invitation for ${inv.email}?`);
    if (!ok) return;
    try {
      await deleteInvitation(inv.id);
      await loadAll();
    } catch {
      setError("Could not delete invitation.");
    }
  }

  function openAcceptModal(inv: Invitation) {
    setError(null);
    setAcceptingInvitation(inv);
    setAcceptedNotes("");
    setVolumeMoved("");
  }

  async function handleConfirmAcceptInvitation() {
    const inv = acceptingInvitation;
    if (!inv) return;

    let volumeNum: number | null = null;
    const trimmedVol = volumeMoved.trim();
    if (trimmedVol !== "") {
      const n = Number(trimmedVol);
      if (!Number.isFinite(n)) {
        setError("Volume moved must be a valid number.");
        return;
      }
      volumeNum = n;
    }

    setAcceptLoading(true);
    setError(null);
    try {
      await acceptInvitation(inv.id, {
        accepted_notes: acceptedNotes.trim() || null,
        volume_moved: volumeNum,
      });
      setAcceptingInvitation(null);
      setAcceptedNotes("");
      setVolumeMoved("");
      setMarkedAcceptedBanner("Marked as accepted");
      await loadAll();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not mark invitation as accepted."
      );
    } finally {
      setAcceptLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-admin-canvas p-6 lg:p-8 animate-pulse">
        <div className="mb-2 h-4 w-24 rounded-full bg-white/10" />
        <div className="mt-4 mb-8 h-8 w-64 rounded-xl bg-white/10" />
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white/[0.06] h-28" />
          ))}
        </div>
        <div className="mb-6 rounded-xl bg-white/[0.06] h-32" />
        <div className="rounded-xl bg-white/[0.06] h-64" />
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="min-h-screen bg-admin-canvas p-6 text-white lg:p-8">
        <p className="text-admin-muted">{error ?? "Strategy not found."}</p>
        <Link
          href="/dashboard/strategies"
          className="mt-4 inline-block text-neko-blue hover:underline"
        >
          ← Back to strategies
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/strategies"
            className="text-sm text-neko-blue hover:underline"
          >
            ← Back to strategies
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="font-klein text-3xl text-admin-text text-balance">
              {strategy.name}
            </h1>
            {stratTypeBadge(strategy.type)}
            <span className={stratStatusBadgeCls(strategy.status)}>
              {strategy.status}
            </span>
          </div>
          <p className="mt-2 text-xs text-admin-subtle">
            {strategy.status === "completed" && strategy.completed_at
              ? `Ran for ${strategyDuration(strategy.created_at, strategy.completed_at)} · closed ${new Date(strategy.completed_at).toLocaleDateString()}`
              : `Active for ${strategyDuration(strategy.created_at, null)}`}
          </p>
          {strategy.description ? (
            <p className="mt-2 text-sm text-admin-muted">
              {strategy.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {strategy.status === "active" || strategy.status === "paused" ? (
            <button
              type="button"
              disabled={closingStrategy}
              onClick={() => void handleCloseStrategy()}
              className="inline-flex items-center justify-center rounded-full border border-admin-border-strong bg-white/[0.06] px-4 py-2 text-sm font-medium text-admin-text ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-50"
            >
              {closingStrategy ? "Closing…" : "Close strategy"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (!strategy) return;
              setEName(strategy.name);
              setEDesc(strategy.description ?? "");
              setEType(strategy.type);
              setETarget(strategy.target_count);
              setETargetVolume(
                strategy.target_volume > 0 ? String(strategy.target_volume) : ""
              );
              setEAssigned(strategy.assigned_to ?? "");
              setEStatus(strategy.status);
              setError(null);
              setEditOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/[0.14]"
          >
            Edit
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-admin-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-admin-border bg-admin-surface p-5">
          <p className="text-sm text-admin-muted">Invited</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {totals.total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-admin-border bg-admin-surface p-5 ring-1 ring-neko-blue/25">
          <p className="text-sm text-admin-muted">Accepted</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {totals.accepted.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-admin-border bg-admin-surface p-5 ring-1 ring-admin-warning/20">
          <p className="text-sm text-admin-muted">Pending</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {totals.pending.toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col justify-center rounded-xl border border-admin-border bg-admin-surface p-5 ring-1 ring-neko-blue/25">
          <p className="text-sm text-admin-muted">Acceptance rate</p>
          <p className="mt-1 text-5xl font-bold tracking-tight text-neko-blue">
            {totals.acceptanceRate.toFixed(
              totals.acceptanceRate % 1 === 0 ? 0 : 1
            )}
            %
          </p>
        </div>
        <div className="rounded-xl border border-admin-border bg-admin-surface p-5 ring-1 ring-neko-blue/15">
          <div className="flex items-center gap-1.5 text-sm text-admin-muted">
            <DollarSign className="size-4 shrink-0 opacity-70" aria-hidden />
            Vol. moved
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums text-white">
            {fmtUsd(totalVolumeMoved)}
          </p>
        </div>
        <div className="rounded-xl border border-admin-border bg-admin-surface p-5 ring-1 ring-neko-blue/20">
          <p className="text-sm text-admin-muted">Real TVL (on-chain)</p>
          <p className="mt-2 text-3xl font-bold text-neko-blue">
            {realTvlLoading ? (
              <span className="inline-block h-8 w-24 animate-pulse rounded-lg bg-white/10" />
            ) : realTvl != null ? (
              fmtUsd(realTvl)
            ) : (
              "—"
            )}
          </p>
          <p className="mt-1 text-xs text-white/35">
            from audit logs since launch
          </p>
        </div>
      </div>

      <section className="mb-8 rounded-xl border border-admin-border bg-admin-surface p-6">
        <h2 className="mb-5 text-lg font-semibold text-white">Progress</h2>
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-white">Users</span>
              <span className="text-admin-muted">
                {totals.accepted} / {strategy.target_count} target
                {strategy.target_count > 0 ? ` · ${pctTarget}%` : ""}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div
                className={`h-2 rounded-full transition-[width] ${progressBg}`}
                style={{ width: `${pctTarget}%` }}
                role="presentation"
              />
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-white">Volume moved</span>
              <span className="text-admin-muted">
                {fmtUsd(totalVolumeMoved)}
                {strategy.target_volume > 0
                  ? ` / ${fmtUsd(strategy.target_volume)} · ${pctVolume}%`
                  : ""}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-lg bg-neko-accent transition-[width]"
                style={{ width: `${pctVolume}%` }}
                role="presentation"
              />
            </div>
            {realTvl != null ? (
              <p className="mt-2 text-xs text-admin-subtle">
                On-chain:{" "}
                <span className="text-admin-muted">{fmtUsd(realTvl)}</span>
                {strategy.target_volume > 0
                  ? ` · ${Math.min(
                      100,
                      Math.round((realTvl / strategy.target_volume) * 100)
                    )}% of target`
                  : ""}
              </p>
            ) : null}
            {strategy.target_volume === 0 ? (
              <p className="mt-1.5 text-xs text-white/35">
                No volume target set
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-white">Invitations</h2>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg bg-neko-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-neko-navy-hover"
            onClick={() => {
              setError(null);
              setInviteOpen(true);
            }}
          >
            Add invitation
          </button>
        </div>
        {markedAcceptedBanner ? (
          <p className="mb-4 text-sm text-neko-blue" role="status">
            {markedAcceptedBanner}
          </p>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-admin-muted">
            <span className="whitespace-nowrap">Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-admin-border bg-admin-surface px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-neko-blue/50 focus:ring-neko-blue/25"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="expired">Expired</option>
            </select>
          </label>
        </div>

        {displayed.length === 0 ? (
          <div className="rounded-xl border border-admin-border bg-admin-surface px-6 py-16 text-center text-white/55">
            {invitations.length === 0
              ? "No invitations yet in this strategy."
              : "No invitations match this filter."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-admin-border bg-admin-surface">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-admin-border text-admin-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Assigned to</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 font-medium">Activity</th>
                  <th className="px-4 py-3 font-medium">Vol. (USD)</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {displayed.map((inv) => (
                  <tr key={inv.id} className="text-admin-text">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-white">
                      {inv.email}
                    </td>
                    <td className="px-4 py-3">{invTypeBadge(inv.type)}</td>
                    <td className="px-4 py-3">
                      <span className={invStatusBadge(inv.status)}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3 text-admin-muted">
                      {inv.assigned_to ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-admin-muted">
                      {relativeFromExpiry(inv.expires_at)}
                    </td>
                    <td className="max-w-[14rem] px-4 py-3 text-admin-muted">
                      {inv.status === "accepted"
                        ? truncateActivityNotes(inv.accepted_notes)
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-admin-muted">
                      {inv.status === "accepted"
                        ? formatVolumeUsd(inv.volume_moved)
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {inv.status === "pending" ? (
                          <button
                            type="button"
                            className="inline-flex items-center rounded-lg bg-neko-blue/15 px-3 py-1 text-xs font-semibold text-neko-blue hover:bg-neko-blue/25"
                            onClick={() => openAcceptModal(inv)}
                          >
                            Accept
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg bg-admin-danger/10 px-2 py-1 text-xs font-medium text-admin-danger transition hover:bg-admin-danger/20"
                          onClick={() => handleDeleteInvitation(inv)}
                        >
                          <Trash2 className="size-3.5 shrink-0" aria-hidden />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-strat-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-admin-border bg-admin-surface p-6 shadow-xl">
            <h2
              id="edit-strat-title"
              className="text-lg font-semibold text-white"
            >
              Edit strategy
            </h2>
            <form onSubmit={handlePatchStrategy} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="e-name"
                  className="block text-xs font-medium text-admin-muted"
                >
                  Name<span className="text-admin-danger">*</span>
                </label>
                <input
                  id="e-name"
                  required
                  value={eName}
                  onChange={(e) => setEName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-admin-border bg-admin-canvas px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-neko-blue/50 focus:ring-neko-blue/25"
                />
              </div>

              <div>
                <label
                  htmlFor="e-desc"
                  className="block text-xs font-medium text-admin-muted"
                >
                  Description
                </label>
                <textarea
                  id="e-desc"
                  rows={3}
                  value={eDesc}
                  onChange={(e) => setEDesc(e.target.value)}
                  className="mt-1 w-full resize-y rounded-xl border border-admin-border bg-admin-canvas px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-neko-blue/50 focus:ring-neko-blue/25"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-admin-muted">
                  Type
                </p>
                <div className="flex flex-wrap gap-2">
                  {STRATEGY_TYPES.map((t) => {
                    const sel = eType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setEType(t.id)}
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
                    htmlFor="e-target"
                    className="block text-xs font-medium text-admin-muted"
                  >
                    Target users
                  </label>
                  <input
                    id="e-target"
                    type="number"
                    min={0}
                    value={eTarget}
                    onChange={(e) => setETarget(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-xl border border-admin-border bg-admin-canvas px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-neko-blue/50 focus:ring-neko-blue/25"
                  />
                </div>
                <div>
                  <label
                    htmlFor="e-target-vol"
                    className="block text-xs font-medium text-admin-muted"
                  >
                    Target volume (USD)
                  </label>
                  <input
                    id="e-target-vol"
                    type="number"
                    min={0}
                    step="any"
                    value={eTargetVolume}
                    onChange={(e) => setETargetVolume(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-admin-border bg-admin-canvas px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-neko-blue/50 focus:ring-neko-blue/25"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="e-assigned"
                  className="block text-xs font-medium text-admin-muted"
                >
                  Assigned to
                </label>
                <select
                  id="e-assigned"
                  value={eAssigned}
                  onChange={(e) => setEAssigned(e.target.value)}
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
                  htmlFor="e-status"
                  className="block text-xs font-medium text-admin-muted"
                >
                  Status
                </label>
                <select
                  id="e-status"
                  value={eStatus}
                  onChange={(e) => setEStatus(e.target.value as StrategyStatus)}
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
                  onClick={() => setEditOpen(false)}
                  disabled={submittingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="inline-flex items-center gap-2 rounded-lg bg-neko-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-neko-navy-hover disabled:opacity-50"
                >
                  {submittingEdit ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {inviteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-inv-modal-title"
        >
          <div className="w-full max-w-md rounded-xl border border-admin-border bg-admin-surface p-6 shadow-xl">
            <h2
              id="add-inv-modal-title"
              className="text-lg font-semibold text-white"
            >
              Add invitation
            </h2>
            <form onSubmit={handleAddInvitation} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="inv-email2"
                  className="block text-xs font-medium text-admin-muted"
                >
                  Email<span className="text-admin-danger">*</span>
                </label>
                <input
                  id="inv-email2"
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-admin-border bg-admin-canvas px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent placeholder:text-white/35 focus:border-neko-blue/50 focus:ring-neko-blue/25"
                  placeholder="name@company.com"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-admin-muted">
                  Type
                </p>
                <div className="flex flex-wrap gap-2">
                  {INVITATION_TYPES.map((t) => {
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

              <div>
                <label
                  htmlFor="inv-assigned2"
                  className="block text-xs font-medium text-admin-muted"
                >
                  Assigned to
                </label>
                <select
                  id="inv-assigned2"
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
                  htmlFor="inv-notes2"
                  className="block text-xs font-medium text-admin-muted"
                >
                  Notes
                </label>
                <textarea
                  id="inv-notes2"
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="mt-1 w-full resize-y rounded-xl border border-admin-border bg-admin-canvas px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent placeholder:text-white/35 focus:border-neko-blue/50 focus:ring-neko-blue/25"
                  placeholder="Optional notes for internal follow-up"
                />
              </div>

              <div>
                <label
                  htmlFor="inv-expires2"
                  className="block text-xs font-medium text-admin-muted"
                >
                  Expires in
                </label>
                <select
                  id="inv-expires2"
                  value={formExpiresDays}
                  onChange={(e) =>
                    setFormExpiresDays(Number(e.target.value) as 7 | 14 | 30)
                  }
                  className="mt-1 w-full rounded-xl border border-admin-border bg-admin-canvas px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-neko-blue/50 focus:ring-neko-blue/25"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-xl border border-admin-border px-4 py-2 text-sm font-medium text-admin-muted hover:bg-white/5"
                  onClick={() => setInviteOpen(false)}
                  disabled={submitInvite}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitInvite}
                  className="inline-flex items-center gap-2 rounded-lg bg-neko-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-neko-navy-hover disabled:opacity-50"
                >
                  {submitInvite ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Sending…
                    </>
                  ) : (
                    "Send invitation"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {acceptingInvitation ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="accept-inv-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-admin-border bg-admin-surface p-6 shadow-xl">
            <h2
              id="accept-inv-title"
              className="text-lg font-semibold text-white"
            >
              Mark as accepted
            </h2>
            <p className="mt-1 text-sm text-admin-muted">
              {acceptingInvitation.email}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="accept-notes"
                  className="block text-xs font-medium text-admin-muted"
                >
                  What did they do?
                </label>
                <select
                  id="accept-notes"
                  value={acceptedNotes}
                  onChange={(e) => setAcceptedNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-admin-border bg-admin-canvas px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-neko-blue/50 focus:ring-neko-blue/25"
                >
                  <option value="">— Select action —</option>
                  {ACTIVITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="accept-volume"
                  className="block text-xs font-medium text-admin-muted"
                >
                  Volume moved (USD)
                </label>
                <input
                  id="accept-volume"
                  type="number"
                  inputMode="decimal"
                  value={volumeMoved}
                  onChange={(e) => setVolumeMoved(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 w-full rounded-xl border border-admin-border bg-admin-canvas px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent placeholder:text-white/35 focus:border-neko-blue/50 focus:ring-neko-blue/25"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-admin-border pt-4">
              <button
                type="button"
                className="rounded-xl border border-admin-border px-4 py-2 text-sm font-medium text-admin-muted hover:bg-white/5"
                onClick={() => {
                  if (!acceptLoading) setAcceptingInvitation(null);
                }}
                disabled={acceptLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={acceptLoading}
                onClick={() => void handleConfirmAcceptInvitation()}
                className="inline-flex items-center gap-2 rounded-lg bg-neko-blue px-5 py-2 text-sm font-semibold text-neko-dark hover:bg-neko-muted disabled:opacity-50"
              >
                {acceptLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Confirm acceptance"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
