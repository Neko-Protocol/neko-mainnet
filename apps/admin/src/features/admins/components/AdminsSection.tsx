"use client";

import { useState } from "react";
import { ShieldCheck, ShieldOff, UserPlus } from "lucide-react";
import { useAddAdmin, useAdmins, useSetAdminActive } from "../hooks/useAdmins";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  TextInput,
} from "@/features/mailing/components/MailingFormControls";

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}

export function AdminsSection() {
  const { data, isPending, isError } = useAdmins();
  const add = useAddAdmin();
  const setActive = useSetAdminActive();
  const [email, setEmail] = useState("");

  const activeCount = (data ?? []).filter((a) => a.is_active).length;

  return (
    <Card
      title="Admins"
      description="Everyone who can sign in to this app. Sign-in codes are only sent to active addresses."
    >
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-white/5 bg-[#141414] p-4">
        <Field
          label="Authorize a new admin"
          hint="They sign in with a one-time code sent to this address."
        >
          <div className="flex gap-2">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@nekoprotocol.xyz"
            />
            <Button
              type="button"
              disabled={!email.trim() || add.isPending}
              onClick={() =>
                add.mutate(email.trim(), { onSuccess: () => setEmail("") })
              }
            >
              <UserPlus className="h-4 w-4" />
              {add.isPending ? "Adding…" : "Add admin"}
            </Button>
          </div>
        </Field>
        <ErrorNote error={add.error} />
      </div>

      {isError ? (
        <ErrorNote error={new Error("Couldn't load admins.")} />
      ) : isPending ? (
        <div className="h-20 animate-pulse rounded-lg bg-white/5" />
      ) : !data.length ? (
        <p className="text-sm text-white/40">No admins yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((a) => (
            <li
              key={a.email}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-white">
                    {a.email}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.is_active
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-white/5 text-white/35"
                    }`}
                  >
                    {a.is_active ? "active" : "revoked"}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-white/30">
                  Added {formatDate(a.created_at)}
                  {a.added_by ? ` by ${a.added_by}` : ""}
                </div>
              </div>

              {a.is_active ? (
                <Button
                  type="button"
                  variant="danger"
                  // The last active admin cannot be revoked from in here:
                  // there'd be no way back in.
                  disabled={setActive.isPending || activeCount <= 1}
                  onClick={() =>
                    setActive.mutate({ email: a.email, isActive: false })
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
                    setActive.mutate({ email: a.email, isActive: true })
                  }
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Restore
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <ErrorNote error={setActive.error} />
      </div>
    </Card>
  );
}
