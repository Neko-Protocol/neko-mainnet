"use client";

import {
  CheckCircle,
  Layers,
  Loader2,
  Mail,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";
import {
  INVITATION_TYPES,
  type Invitation,
  type InvitationType,
} from "@/lib/invitations-schema";

function relativeFromExpiry(iso: string): string {
  const roundedDays = Math.round(
    (new Date(iso).getTime() - Date.now()) / 86_400_000
  );
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  return rtf.format(roundedDays, "day");
}

function truncateNotes(s: string | null): string {
  if (!s || !s.trim()) return "—";
  const t = s.trim();
  if (t.length <= 40) return t;
  return `${t.slice(0, 40)}…`;
}

function typeBadge(type: InvitationType) {
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

function statusBadge(status: Invitation["status"]) {
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

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterAssigned, setFilterAssigned] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formType, setFormType] = useState<InvitationType>("user");
  const [formAssigned, setFormAssigned] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formExpiresDays, setFormExpiresDays] = useState<7 | 14 | 30>(7);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (
      filterStatus === "pending" ||
      filterStatus === "accepted" ||
      filterStatus === "expired"
    )
      p.set("status", filterStatus);
    if (filterType && INVITATION_TYPES.some((t) => t.id === filterType))
      p.set("type", filterType);
    if (filterAssigned.trim()) p.set("assigned_to", filterAssigned.trim());
    const q = p.toString();
    return q ? `?${q}` : "";
  }, [filterStatus, filterType, filterAssigned]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<Invitation[]>(`/api/invitations${qs}`);
      setInvitations(data);
    } catch {
      setError("Could not load invitations.");
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    startTransition(() => {
      void refresh();
    });
  }, [refresh]);

  useEffect(() => {
    fetchJson<{ emails: string[] }>("/api/admin-users")
      .then((data) =>
        setAdminEmails(Array.isArray(data.emails) ? data.emails : [])
      )
      .catch(() => setAdminEmails([]));
  }, []);

  const counts = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let expired = 0;
    for (const inv of invitations) {
      if (inv.status === "pending") pending += 1;
      else if (inv.status === "accepted") accepted += 1;
      else if (inv.status === "expired") expired += 1;
    }
    return {
      total: invitations.length,
      pending,
      accepted,
      expired,
    };
  }, [invitations]);

  async function handleSendInvitation(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/invitations", {
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
      const emailSent = formEmail.trim().toLowerCase();
      setModalOpen(false);
      setFormEmail("");
      setFormType("user");
      setFormAssigned("");
      setFormNotes("");
      setFormExpiresDays(7);
      setSuccessMsg(`Invitation sent to ${emailSent}`);
      setError(null);
      await refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(inv: Invitation) {
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
      await refresh();
    } catch {
      setError("Network error.");
    }
  }

  return (
    <div className="min-h-screen bg-[#121212] p-6 lg:p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Invitations</h1>
          <p className="text-sm text-white/50">
            Invite users by email, assign roles, and track responsible admins
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full bg-[#229EDF] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1a8bc7]"
          onClick={() => {
            setSuccessMsg(null);
            setModalOpen(true);
          }}
        >
          New invitation
        </button>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5 ring-1 ring-white/5">
          <div className="flex justify-between gap-2">
            <p className="text-sm font-medium text-white/50">Total</p>
            <Layers className="size-5 text-white/40" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{counts.total}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5 ring-1 ring-yellow-500/20">
          <div className="flex justify-between gap-2">
            <p className="text-sm font-medium text-white/50">Pending</p>
            <Mail className="size-5 text-yellow-400/60" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{counts.pending}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5 ring-1 ring-[#4ADE80]/30">
          <div className="flex justify-between gap-2">
            <p className="text-sm font-medium text-white/50">Accepted</p>
            <CheckCircle className="size-5 text-[#4ADE80]/60" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {counts.accepted}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] p-5 ring-1 ring-white/5">
          <div className="flex justify-between gap-2">
            <p className="text-sm font-medium text-white/50">Expired</p>
            <UserPlus className="size-5 text-white/40" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{counts.expired}</p>
        </div>
      </div>

      {successMsg ? (
        <p className="mb-4 text-sm font-medium text-[#4ADE80]" role="status">
          {successMsg}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-3">
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
        <label className="flex items-center gap-2 text-xs text-white/50">
          <span className="whitespace-nowrap">Type</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#1C1C1C] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-[#229EDF]/50 focus:ring-[#229EDF]/25"
          >
            <option value="">All</option>
            {INVITATION_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-white/50">
          <span className="whitespace-nowrap">Assigned to</span>
          <select
            value={filterAssigned}
            onChange={(e) => setFilterAssigned(e.target.value)}
            className="min-w-[10rem] rounded-xl border border-white/10 bg-[#1C1C1C] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent focus:border-[#229EDF]/50 focus:ring-[#229EDF]/25"
          >
            <option value="">All</option>
            {adminEmails.map((em) => (
              <option key={em} value={em}>
                {em}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!loading && invitations.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-[#1C1C1C] px-6 py-16 text-center text-white/60">
          No invitations yet. Send your first one.
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Loading…
        </div>
      ) : invitations.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-white/8 bg-[#1C1C1C]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/8 text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Assigned to</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {invitations.map((inv) => (
                <tr key={inv.id} className="text-white/85">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-white">
                    {inv.email}
                  </td>
                  <td className="px-4 py-3">{typeBadge(inv.type)}</td>
                  <td className="px-4 py-3">
                    <span className={statusBadge(inv.status)}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="max-w-[12rem] truncate px-4 py-3 text-white/70">
                    {inv.assigned_to ?? "—"}
                  </td>
                  <td
                    className="max-w-[12rem] truncate px-4 py-3 text-white/60"
                    title={inv.notes ?? undefined}
                  >
                    {truncateNotes(inv.notes)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/60">
                    {relativeFromExpiry(inv.expires_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-white/60">
                    {new Date(inv.created_at).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
                      onClick={() => handleDelete(inv)}
                    >
                      <Trash2 className="size-3.5 shrink-0" aria-hidden />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inv-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1C1C1C] p-6 shadow-xl">
            <h2
              id="inv-modal-title"
              className="text-lg font-semibold text-white"
            >
              New invitation
            </h2>
            <form onSubmit={handleSendInvitation} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="inv-email"
                  className="block text-xs font-medium text-white/50"
                >
                  Email<span className="text-red-400">*</span>
                </label>
                <input
                  id="inv-email"
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
                  htmlFor="inv-assigned"
                  className="block text-xs font-medium text-white/50"
                >
                  Assigned to
                </label>
                <select
                  id="inv-assigned"
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
                  htmlFor="inv-notes"
                  className="block text-xs font-medium text-white/50"
                >
                  Notes
                </label>
                <textarea
                  id="inv-notes"
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent placeholder:text-white/35 focus:border-[#229EDF]/50 focus:ring-[#229EDF]/25"
                  placeholder="Optional notes for internal follow-up"
                />
              </div>

              <div>
                <label
                  htmlFor="inv-expires"
                  className="block text-xs font-medium text-white/50"
                >
                  Expires in
                </label>
                <select
                  id="inv-expires"
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
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#229EDF] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1a8bc7] disabled:opacity-50"
                >
                  {submitting ? (
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
    </div>
  );
}
