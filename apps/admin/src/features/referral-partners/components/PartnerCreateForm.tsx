"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { ReferralPartnerType } from "@neko/api-contracts";
import { useCreateReferralPartner } from "../hooks/useReferralPartners";
import {
  Button,
  ErrorNote,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui/FormControls";

function emptyForm() {
  return {
    name: "",
    type: "company" as ReferralPartnerType,
    code: "",
    email: "",
    notes: "",
  };
}

/** Create form for a new company/influencer referral code. */
export function PartnerCreateForm() {
  const create = useCreateReferralPartner();
  const [form, setForm] = useState(emptyForm());

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
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="partner@example.com"
          />
        </Field>
      </div>
      <Field
        label="Notes"
        hint="Optional, contract terms, handle, anything worth remembering."
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
  );
}
