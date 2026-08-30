"use client";

import { useState } from "react";
import { Send, TestTube2, Users } from "lucide-react";
import type { MailingAudienceId } from "@neko/api-contracts";
import {
  useAudiencePreview,
  useAudiences,
  useTemplates,
} from "../hooks/useMailingQueries";
import { useSendNewBroadcast, useSendTest } from "../hooks/useMailingMutations";
import { EmailPreview } from "./EmailPreview";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Select,
  TextArea,
  TextInput,
} from "./MailingFormControls";

/** Audiences the user asked to be able to target, pinned to the top. */
const PRIMARY_AUDIENCES: MailingAudienceId[] = [
  "all",
  "vault_depositors",
  "admins",
];

export function BroadcastComposer() {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<MailingAudienceId>("all");
  const [testEmail, setTestEmail] = useState("");
  const [confirming, setConfirming] = useState(false);

  const audiences = useAudiences();
  const preview = useAudiencePreview(audience);
  const templates = useTemplates();
  const send = useSendNewBroadcast();
  const sendTest = useSendTest();

  const options = (audiences.data ?? []).slice().sort((a, b) => {
    const ai = PRIMARY_AUDIENCES.indexOf(a.id);
    const bi = PRIMARY_AUDIENCES.indexOf(b.id);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  const selected = options.find((a) => a.id === audience);

  const canSubmit =
    name.trim().length > 0 &&
    subject.trim().length > 0 &&
    body.trim().length > 0;

  const recipientCount = preview.data?.count ?? 0;

  const reset = () => {
    setName("");
    setSubject("");
    setBody("");
    setConfirming(false);
  };

  const applyTemplate = (templateId: string) => {
    const template = (templates.data ?? []).find((t) => t.id === templateId);
    if (!template) return;
    setSubject(template.subject);
    setBody(template.body_html);
    if (!name.trim()) setName(template.name);
  };

  return (
    <Card
      title="Send a mass email"
      description="Compose a one-off email and send it to a whole audience. Saved as a broadcast so you can see what went out."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Field
            label="Internal name"
            hint="Only shown in the admin history. Recipients never see this."
          >
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="November product update"
            />
          </Field>

          <Field label="Subject" hint="The subject line recipients will see.">
            <TextInput
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's new at Neko this month"
            />
          </Field>

          <Field
            label="Audience"
            hint={selected?.description ?? "Who receives this email."}
          >
            <Select
              value={audience}
              onChange={(e) => setAudience(e.target.value as MailingAudienceId)}
            >
              {options.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-[#141414] px-3 py-2.5">
            <Users className="h-4 w-4 shrink-0 text-white/40" />
            {preview.isPending ? (
              <span className="text-sm text-white/40">
                Counting recipients…
              </span>
            ) : preview.isError ? (
              <span className="text-sm text-red-400">
                Couldn&apos;t count recipients.
              </span>
            ) : (
              <span className="text-sm text-white/70">
                <strong className="text-white">
                  {recipientCount.toLocaleString()}
                </strong>{" "}
                {recipientCount === 1 ? "recipient" : "recipients"}
                <span className="text-white/35"> · opt-outs excluded</span>
              </span>
            )}
          </div>

          {(templates.data ?? []).length > 0 && (
            <Field
              label="Start from a template"
              hint="Copies the template's subject and body into this form."
            >
              <Select
                defaultValue=""
                onChange={(e) => {
                  applyTemplate(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="" disabled>
                  Choose a template…
                </option>
                {(templates.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Field
            label="Body (HTML)"
            hint="The full HTML email. Supports {{email}}, {{wallet_address}}, and {{unsubscribe_url}}. If you omit the last one, an unsubscribe button is appended for you."
          >
            <TextArea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              placeholder="<p>Hi there,</p>"
            />
          </Field>

          <EmailPreview bodyHtml={body} label="Preview email" />

          <Field label="Send a test first" hint="Sends only to this address.">
            <div className="flex gap-2">
              <TextInput
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@nekoprotocol.xyz"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!canSubmit || !testEmail.trim() || sendTest.isPending}
                onClick={() =>
                  sendTest.mutate({
                    subject: subject.trim(),
                    body_html: body,
                    email: testEmail.trim(),
                  })
                }
              >
                <TestTube2 className="h-4 w-4" />
                {sendTest.isPending ? "Sending…" : "Test"}
              </Button>
            </div>
          </Field>
          {sendTest.isSuccess && (
            <p className="text-xs text-emerald-400">
              Test sent to {testEmail}.
            </p>
          )}
          <ErrorNote error={sendTest.error} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/5 pt-4">
        {confirming ? (
          <>
            <span className="text-sm text-white/70">
              Send to {recipientCount.toLocaleString()}{" "}
              {recipientCount === 1 ? "person" : "people"}? This can&apos;t be
              undone.
            </span>
            <Button
              type="button"
              disabled={send.isPending}
              onClick={() =>
                send.mutate(
                  {
                    name: name.trim(),
                    subject: subject.trim(),
                    body_html: body,
                    audience,
                  },
                  { onSuccess: reset }
                )
              }
            >
              <Send className="h-4 w-4" />
              {send.isPending ? "Sending…" : "Yes, send now"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirming(false)}
              disabled={send.isPending}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            type="button"
            disabled={!canSubmit || recipientCount === 0}
            onClick={() => setConfirming(true)}
          >
            <Send className="h-4 w-4" />
            Send mass email
          </Button>
        )}
        {send.isSuccess && !confirming && (
          <span className="text-sm text-emerald-400">
            Sent to {send.data?.sent_count ?? 0} recipients
            {send.data?.failed_count
              ? ` (${send.data.failed_count} failed)`
              : ""}
            .
          </span>
        )}
      </div>
      <div className="mt-3">
        <ErrorNote error={send.error} />
      </div>
    </Card>
  );
}
