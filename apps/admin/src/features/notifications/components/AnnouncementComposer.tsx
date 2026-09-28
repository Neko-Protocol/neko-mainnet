"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { NOTIFICATION_CATEGORIES } from "@neko-protocol/api-contracts";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui/FormControls";
import { useAudiences } from "@/features/mailing/hooks/useMailingQueries";
import {
  useCreateNotificationMessage,
  useSendAnnouncement,
} from "../hooks/useNotificationMutations";
import { useNotificationAudiencePreview } from "../hooks/useNotificationQueries";
import { NotificationPreview } from "./NotificationPreview";

/**
 * The in-app counterpart to the mass-email composer.
 *
 * Unlike email, the audience here is counted in wallets rather than verified
 * addresses, so "all" genuinely means everyone who has connected.
 */
export function AnnouncementComposer() {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("system");
  const [audience, setAudience] = useState("all");
  const [confirming, setConfirming] = useState(false);

  const audiences = useAudiences();
  const preview = useNotificationAudiencePreview(audience);
  const create = useCreateNotificationMessage();
  const send = useSendAnnouncement();

  const count = preview.data?.count ?? 0;
  const isSending = create.isPending || send.isPending;
  const canSend = Boolean(name.trim() && title.trim() && body.trim() && count);

  const reset = () => {
    setName("");
    setTitle("");
    setBody("");
    setUrl("");
    setConfirming(false);
  };

  const handleSend = () => {
    create.mutate(
      {
        kind: "announcement",
        name: name.trim(),
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || null,
        category,
        audience,
      },
      {
        onSuccess: (message) => send.mutate(message.id, { onSuccess: reset }),
      }
    );
  };

  return (
    <Card
      title="Announcement"
      description="Push a one-off notification to everyone in an audience. It appears in the bell, not in an inbox."
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Internal name">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="February vault launch"
            />
          </Field>

          <Field
            label="Audience"
            hint={
              preview.isPending
                ? "Counting…"
                : `${count.toLocaleString()} wallet${count === 1 ? "" : "s"}`
            }
          >
            <Select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            >
              {(audiences.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Title">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="New vault is live"
            />
          </Field>

          <Field label="Category">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {NOTIFICATION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Body">
          <TextArea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            placeholder="The USDC vault is now open for deposits."
          />
        </Field>

        <Field label="Link (optional)" hint="In-app path, for example /vault.">
          <TextInput
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/vault"
          />
        </Field>

        <NotificationPreview title={title} body={body} category={category} />

        <ErrorNote error={create.error} />
        <ErrorNote error={send.error} />

        {send.isSuccess && (
          <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400">
            Sent to {send.data.sent.toLocaleString()} wallets.
          </p>
        )}

        {/* Two-step confirm, same as the mass-email composer: a notification
            cannot be recalled once it is in someone's bell. */}
        {confirming ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <span className="text-sm text-amber-400">
              Send to {count.toLocaleString()} wallet
              {count === 1 ? "" : "s"}? This cannot be undone.
            </span>
            <Button type="button" disabled={isSending} onClick={handleSend}>
              {isSending ? "Sending…" : "Confirm send"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            disabled={!canSend}
            onClick={() => setConfirming(true)}
          >
            <Megaphone className="h-4 w-4" />
            Send announcement
          </Button>
        )}
      </div>
    </Card>
  );
}
