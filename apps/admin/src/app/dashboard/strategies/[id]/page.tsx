"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
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
  const color = meta?.color ?? "#229EDF";
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-white/15"
      style={{ color, backgroundColor: `${color}22` }}
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
      return `${base} bg-[#4ADE80]/15 text-[#4ADE80]`;
    case "paused":
      return `${base} bg-amber-500/15 text-amber-200`;
    case "completed":
      return `${base} bg-[#229EDF]/15 text-[#229EDF]`;
    default:
      return `${base} bg-white/10 text-white/40`;
  }
}

function invTypeBadge(type: InvitationType) {
  const meta = INVITATION_TYPES.find((x) => x.id === type);
  const label = meta?.label ?? type;
  const color = meta?.color ?? "#229EDF";
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-white/15"
      style={{ color, backgroundColor: `${color}22` }}
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
      return `${base} bg-green-500/15 text-green-400`;
    case "expired":
      return `${base} bg-white/10 text-white/40`;
    default:
      return `${base} bg-white/10 text-white/40`;
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

async function fetchJson<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: "include", ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export default function StrategyDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>("");

  const [editOpen, setEditOpen] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [eName, setEName] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eType, setEType] = useState<StrategyType>("acquisition");
  const [eTarget, setETarget] = useState(0);
  const [eAssigned, setEAssigned] = useState("");
  const [eStatus, setEStatus] = useState<StrategyStatus>("active");

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

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [s, invs] = await Promise.all([
        fetchJson<Strategy>(`/api/strategies/${id}`),
        fetchJson<Invitation[]>(`/api/strategies/${id}/invitations`),
      ]);
      setStrategy(s);
      setInvitations(Array.isArray(invs) ? invs : []);
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

  useEffect(() => {
    fetchJson<{ emails: string[] }>("/api/admin-users")
      .then((data) =>
        setAdminEmails(Array.isArray(data.emails) ? data.emails : [])
      )
      .catch(() => setAdminEmails([]));
  }, []);

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

  const pctTarget =
    strategy && strategy.target_count > 0
      ? Math.min(
          100,
          Math.round((totals.accepted / strategy.target_count) * 100)
        )
      : 0;

  let progressHue: "green" | "blue" | "yellow" = "yellow";
  if (pctTarget > 80) progressHue = "green";
  else if (pctTarget >= 40) progressHue = "blue";

  const progressBg =
    progressHue === "green"
      ? "bg-[#4ADE80]"
      : progressHue === "blue"
        ? "bg-[#229EDF]"
        : "bg-amber-400";

  async function handlePatchStrategy(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !strategy) return;
    setSubmittingEdit(true);
    try {
      const res = await fetch(`/api/strategies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: eName.trim(),
          description: eDesc.trim() || null,
          type: eType,
          target_count: eTarget,
          assigned_to: eAssigned.trim() || null,
          status: eStatus,
        }),
      });
      if (!res.ok) {
        setError("Could not update strategy.");
        return;
      }
      setEditOpen(false);
      await loadAll();
      setError(null);
    } catch {
      setError("Network error.");
    } finally {
      setSubmittingEdit(false);
    }
  }

  async function handleAddInvitation(ev: React.FormEvent) {
    ev.preventDefault();
    if (!id) return;
    setSubmitInvite(true);
    try {
      const res = await fetch(`/api/strategies/${id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formEmail.trim(),
          type: formType,
          assigned_to: formAssigned.trim() || undefined,
          notes: formNotes.trim() || undefined,
          expires_days: formExpiresDays,
        }),
      });
      if (!res.ok) {
        let msg = "Failed to send invitation.";
        try {
          const j = (await res.json()) as { error?: string };
          if (typeof j?.error === "string") msg = j.error;
        } catch {
          //
        }
        setError(msg);
        return;
      }
      setInviteOpen(false);
      setFormEmail("");
      setFormType("user");
      setFormAssigned("");
      setFormNotes("");
      setFormExpiresDays(7);
      setError(null);
      await loadAll();
    } catch {
      setError("Network error.");
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
      const res = await fetch(`/api/invitations/${inv.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        setError("Could not delete invitation.");
        return;
      }
      await loadAll();
    } catch {
      setError("Network error.");
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
      const res = await fetch(`/api/invitations/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accepted_notes: acceptedNotes.trim() || null,
          volume_moved: volumeNum,
        }),
      });
      if (!res.ok) {
        let msg = "Could not mark invitation as accepted.";
        try {
          const j = (await res.json()) as { error?: string };
          if (typeof j?.error === "string") msg = j.error;
        } catch {
          //
        }
        setError(msg);
        return;
      }
      setAcceptingInvitation(null);
      setAcceptedNotes("");
      setVolumeMoved("");
      setMarkedAcceptedBanner("Marked as accepted");
      await loadAll();
    } catch {
      setError("Network error.");
    } finally {
      setAcceptLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center gap-2 bg-[#121212] p-6 text-white/60 lg:p-8">
        <Loader2 className="size-6 animate-spin" aria-hidden />
        Loading strategy…
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="min-h-screen bg-[#121212] p-6 text-white lg:p-8">
        <p className="text-white/70">{error ?? "Strategy not found."}</p>
        <Link
          href="/dashboard/strategies"
          className="mt-4 inline-block text-[#229EDF] hover:underline"
        >
          ← Back to strategies
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/strategies"
            className="text-sm text-[#229EDF] hover:underline"
          >
            ← Back to strategies
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-white">
              {strategy.name}
            </h1>
            {stratTypeBadge(strategy.type)}
            <span className={stratStatusBadgeCls(strategy.status)}>
              {strategy.status}
            </span>
          </div>
          {strategy.description ? (
            <p className="mt-2 text-sm text-white/50">{strategy.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            if (!strategy) return;
            setEName(strategy.name);
            setEDesc(strategy.description ?? "");
            setEType(strategy.type);
            setETarget(strategy.target_count);
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

      {error ? (
        <p className="mb-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5">
          <p className="text-sm text-white/50">Invited</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {totals.total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5 ring-1 ring-[#4ADE80]/25">
          <p className="text-sm text-white/50">Accepted</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {totals.accepted.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5 ring-1 ring-amber-500/20">
          <p className="text-sm text-white/50">Pending</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {totals.pending.toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col justify-center rounded-2xl border border-white/8 bg-[#1C1C1C] p-5 ring-1 ring-[#229EDF]/25">
          <p className="text-sm text-white/50">Acceptance rate</p>
          <p className="mt-1 text-5xl font-bold tracking-tight text-[#229EDF]">
            {totals.acceptanceRate.toFixed(
              totals.acceptanceRate % 1 === 0 ? 0 : 1
            )}
            %
          </p>
        </div>
      </div>

      <section className="mb-10 rounded-2xl border border-white/8 bg-[#1C1C1C] p-6">
        <h2 className="text-lg font-semibold text-white">Progress</h2>
        <div className="mt-5">
          <div className="h-3 rounded-full bg-white/10">
            <div
              className={`h-3 rounded-full transition-[width] ${progressBg}`}
              style={{ width: `${pctTarget}%` }}
              role="presentation"
            />
          </div>
          <p className="mt-3 text-sm text-white/60">
            <span className="font-medium text-white">
              {totals.accepted} of {strategy.target_count}
            </span>{" "}
            target reached ({pctTarget}%)
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-white">Invitations</h2>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-[#229EDF] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1a8bc7]"
            onClick={() => {
              setError(null);
              setInviteOpen(true);
            }}
          >
            Add invitation
          </button>
        </div>
        {markedAcceptedBanner ? (
          <p className="mb-4 text-sm text-[#4ADE80]" role="status">
            {markedAcceptedBanner}
          </p>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-white/50">
            <span className="whitespace-nowrap">Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#1C1C1C] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-[#229EDF]/50 focus:ring-[#229EDF]/25"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="expired">Expired</option>
            </select>
          </label>
        </div>

        {displayed.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] px-6 py-16 text-center text-white/55">
            {invitations.length === 0
              ? "No invitations yet in this strategy."
              : "No invitations match this filter."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/8 bg-[#1C1C1C]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/8 text-white/50">
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
              <tbody className="divide-y divide-white/8">
                {displayed.map((inv) => (
                  <tr key={inv.id} className="text-white/85">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-white">
                      {inv.email}
                    </td>
                    <td className="px-4 py-3">{invTypeBadge(inv.type)}</td>
                    <td className="px-4 py-3">
                      <span className={invStatusBadge(inv.status)}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3 text-white/70">
                      {inv.assigned_to ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-white/60">
                      {relativeFromExpiry(inv.expires_at)}
                    </td>
                    <td className="max-w-[14rem] px-4 py-3 text-white/70">
                      {inv.status === "accepted"
                        ? truncateActivityNotes(inv.accepted_notes)
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-white/70">
                      {inv.status === "accepted"
                        ? formatVolumeUsd(inv.volume_moved)
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {inv.status === "pending" ? (
                          <button
                            type="button"
                            className="inline-flex items-center rounded-lg bg-[#4ADE80]/15 px-3 py-1 text-xs font-semibold text-[#4ADE80] hover:bg-[#4ADE80]/25"
                            onClick={() => openAcceptModal(inv)}
                          >
                            Accept
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
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
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#1C1C1C] p-6 shadow-xl">
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
                  className="block text-xs font-medium text-white/50"
                >
                  Name<span className="text-red-400">*</span>
                </label>
                <input
                  id="e-name"
                  required
                  value={eName}
                  onChange={(e) => setEName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-[#229EDF]/50 focus:ring-[#229EDF]/25"
                />
              </div>

              <div>
                <label
                  htmlFor="e-desc"
                  className="block text-xs font-medium text-white/50"
                >
                  Description
                </label>
                <textarea
                  id="e-desc"
                  rows={3}
                  value={eDesc}
                  onChange={(e) => setEDesc(e.target.value)}
                  className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-[#229EDF]/50 focus:ring-[#229EDF]/25"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-white/50">Type</p>
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
                            ? "border-[#229EDF] text-white shadow-[inset_0_0_0_1px_rgba(34,158,223,0.35)]"
                            : "border-white/10 text-white/70 hover:border-white/20"
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
                  htmlFor="e-target"
                  className="block text-xs font-medium text-white/50"
                >
                  Target count
                </label>
                <input
                  id="e-target"
                  type="number"
                  min={0}
                  value={eTarget}
                  onChange={(e) => setETarget(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-[#229EDF]/50 focus:ring-[#229EDF]/25"
                />
              </div>

              <div>
                <label
                  htmlFor="e-assigned"
                  className="block text-xs font-medium text-white/50"
                >
                  Assigned to
                </label>
                <select
                  id="e-assigned"
                  value={eAssigned}
                  onChange={(e) => setEAssigned(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-[#229EDF]/50 focus:ring-[#229EDF]/25"
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
                  className="block text-xs font-medium text-white/50"
                >
                  Status
                </label>
                <select
                  id="e-status"
                  value={eStatus}
                  onChange={(e) => setEStatus(e.target.value as StrategyStatus)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-[#229EDF]/50 focus:ring-[#229EDF]/25"
                >
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="completed">completed</option>
                </select>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/5"
                  onClick={() => setEditOpen(false)}
                  disabled={submittingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#229EDF] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1a8bc7] disabled:opacity-50"
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
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1C1C1C] p-6 shadow-xl">
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
                  className="block text-xs font-medium text-white/50"
                >
                  Email<span className="text-red-400">*</span>
                </label>
                <input
                  id="inv-email2"
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent placeholder:text-white/35 focus:border-[#229EDF]/50 focus:ring-[#229EDF]/25"
                  placeholder="name@company.com"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-white/50">Type</p>
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
                            ? "border-[#229EDF] text-white shadow-[inset_0_0_0_1px_rgba(34,158,223,0.35)]"
                            : "border-white/10 text-white/70 hover:border-white/20"
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
                  className="block text-xs font-medium text-white/50"
                >
                  Assigned to
                </label>
                <select
                  id="inv-assigned2"
                  value={formAssigned}
                  onChange={(e) => setFormAssigned(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-[#229EDF]/50 focus:ring-[#229EDF]/25"
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
                  className="block text-xs font-medium text-white/50"
                >
                  Notes
                </label>
                <textarea
                  id="inv-notes2"
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent placeholder:text-white/35 focus:border-[#229EDF]/50 focus:ring-[#229EDF]/25"
                  placeholder="Optional notes for internal follow-up"
                />
              </div>

              <div>
                <label
                  htmlFor="inv-expires2"
                  className="block text-xs font-medium text-white/50"
                >
                  Expires in
                </label>
                <select
                  id="inv-expires2"
                  value={formExpiresDays}
                  onChange={(e) =>
                    setFormExpiresDays(Number(e.target.value) as 7 | 14 | 30)
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-[#229EDF]/50 focus:ring-[#229EDF]/25"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/5"
                  onClick={() => setInviteOpen(false)}
                  disabled={submitInvite}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitInvite}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#229EDF] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1a8bc7] disabled:opacity-50"
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
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#1C1C1C] p-6 shadow-xl">
            <h2
              id="accept-inv-title"
              className="text-lg font-semibold text-white"
            >
              Mark as accepted
            </h2>
            <p className="mt-1 text-sm text-white/50">
              {acceptingInvitation.email}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="accept-notes"
                  className="block text-xs font-medium text-white/50"
                >
                  What did they do?
                </label>
                <select
                  id="accept-notes"
                  value={acceptedNotes}
                  onChange={(e) => setAcceptedNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-[#229EDF]/50 focus:ring-[#229EDF]/25"
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
                  className="block text-xs font-medium text-white/50"
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
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent placeholder:text-white/35 focus:border-[#229EDF]/50 focus:ring-[#229EDF]/25"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-white/8 pt-4">
              <button
                type="button"
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/5"
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
                className="inline-flex items-center gap-2 rounded-xl bg-[#4ADE80] px-5 py-2 text-sm font-semibold text-[#121212] transition hover:bg-[#6ee793] disabled:opacity-50"
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
