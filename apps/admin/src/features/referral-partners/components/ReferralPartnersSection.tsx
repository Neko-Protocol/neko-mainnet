"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Link2, Plus, ShieldCheck, ShieldOff } from "lucide-react";
import type { ReferralPartner, ReferralPartnerType } from "@neko/api-contracts";
import {
  useCreateReferralPartner,
  useReferralPartners,
  useSetReferralPartnerActive,
} from "../hooks/useReferralPartners";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui/FormControls";

type FilterTab = "all" | ReferralPartnerType;

const TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "company", label: "Companies" },
  { value: "influencer", label: "Influencers" },
];

const TYPE_STYLES: Record<ReferralPartnerType, string> = {
  company: "bg-[#229EDF]/10 text-[#229EDF]",
  influencer: "bg-purple-500/10 text-purple-400",
};

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}

const WEB_APP_URL = process.env.NEXT_PUBLIC_WEB_APP_URL?.replace(/\/$/, "");

/** null when NEXT_PUBLIC_WEB_APP_URL isn't configured, so the UI can say so
 * instead of copying a broken relative link. */
function referralLink(code: string): string | null {
  return WEB_APP_URL ? `${WEB_APP_URL}/?ref=${code}` : null;
}

function emptyForm() {
  return {
    name: "",
    type: "company" as ReferralPartnerType,
    code: "",
    email: "",
    notes: "",
  };
}

export function ReferralPartnersSection() {
  const { data, isPending, isError } = useReferralPartners();
  const create = useCreateReferralPartner();
  const setActive = useSetReferralPartnerActive();
  const { copy, copiedKey } = useCopyToClipboard();

  const [tab, setTab] = useState<FilterTab>("all");
  const [form, setForm] = useState(emptyForm());
  const [open, setOpen] = useState(true);

  const partners = useMemo(() => data ?? [], [data]);
  const counts = useMemo(
    () => ({
      all: partners.length,
      company: partners.filter((p) => p.type === "company").length,
      influencer: partners.filter((p) => p.type === "influencer").length,
    }),
    [partners]
  );
  const visible =
    tab === "all" ? partners : partners.filter((p) => p.type === tab);

  const canSubmit = form.name.trim() && form.code.trim() && !create.isPending;

  function submit() {
    create.mutate(
      {
        name: form.name.trim(),
        type: form.type,
        code: form.code.trim().toUpperCase(),
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
      },
      { onSuccess: () => setForm(emptyForm()) }
    );
  }

  return (
    <Card
      title="Referral partners"
      description="Referral codes created directly for companies and influencers we've contracted, separate from the codes users get on their own."
      collapsible
      open={open}
      onToggle={() => setOpen((v) => !v)}
    >
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-white/5 bg-[#141414] p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <TextInput
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Acme Inc. or Jane Doe"
            />
          </Field>
          <Field label="Type">
            <Select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as ReferralPartnerType,
                }))
              }
            >
              <option value="company">Company</option>
              <option value="influencer">Influencer</option>
            </Select>
          </Field>
          <Field label="Code" hint="Shown to the partner, e.g. ACME10.">
            <TextInput
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
              placeholder="ACME10"
            />
          </Field>
          <Field label="Email" hint="Optional.">
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="partner@example.com"
            />
          </Field>
        </div>
        <Field
          label="Notes"
          hint="Optional — contract terms, handle, anything worth remembering."
        >
          <TextArea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
          />
        </Field>
        <div className="flex items-center justify-end gap-3">
          <Button type="button" disabled={!canSubmit} onClick={submit}>
            <Plus className="h-4 w-4" />
            {create.isPending ? "Creating…" : "Create code"}
          </Button>
        </div>
        <ErrorNote error={create.error} />
      </div>

      <div className="mb-3 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.value
                ? "bg-[#229EDF] text-white"
                : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            {t.label} <span className="opacity-70">({counts[t.value]})</span>
          </button>
        ))}
      </div>

      {isError ? (
        <ErrorNote error={new Error("Couldn't load referral partners.")} />
      ) : isPending ? (
        <div className="h-20 animate-pulse rounded-lg bg-white/5" />
      ) : !visible.length ? (
        <p className="text-sm text-white/40">
          {partners.length
            ? "None in this category yet."
            : "No partner codes yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Link</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {visible.map((p: ReferralPartner) => (
                <tr
                  key={p.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.04]"
                >
                  <td className="px-4 py-3 text-white">{p.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${TYPE_STYLES[p.type]}`}
                    >
                      {p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => copy(p.id, p.code)}
                      className="group flex items-center gap-1.5 font-mono text-white/70 transition-colors hover:text-white"
                    >
                      {p.code}
                      {copiedKey === p.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3 text-white/40 group-hover:text-white/70" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const link = referralLink(p.code);
                      if (!link) {
                        return (
                          <span className="text-xs text-white/30">
                            set NEXT_PUBLIC_WEB_APP_URL
                          </span>
                        );
                      }
                      const key = `${p.id}-link`;
                      return (
                        <button
                          onClick={() => copy(key, link)}
                          className="group flex items-center gap-1.5 text-white/70 transition-colors hover:text-white"
                        >
                          <Link2 className="h-3.5 w-3.5 text-white/40 group-hover:text-white/70" />
                          {copiedKey === key ? (
                            <span className="text-xs text-emerald-400">
                              Copied
                            </span>
                          ) : (
                            <span className="text-xs">Copy link</span>
                          )}
                        </button>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-white/70">{p.email ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.is_active
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-white/5 text-white/35"
                      }`}
                    >
                      {p.is_active ? "active" : "revoked"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-white/70">
                    {formatDate(p.created_at)}
                    {p.created_by ? (
                      <span className="block text-xs text-white/30">
                        by {p.created_by}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.is_active ? (
                      <Button
                        type="button"
                        variant="danger"
                        disabled={setActive.isPending}
                        onClick={() =>
                          setActive.mutate({ id: p.id, isActive: false })
                        }
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                        Revoke
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={setActive.isPending}
                        onClick={() =>
                          setActive.mutate({ id: p.id, isActive: true })
                        }
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Restore
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3">
        <ErrorNote error={setActive.error} />
      </div>
    </Card>
  );
}
