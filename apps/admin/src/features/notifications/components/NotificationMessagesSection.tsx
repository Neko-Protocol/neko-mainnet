"use client";

import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import type { NotificationMessage } from "@neko/api-contracts";
import {
  Button,
  Card,
  ErrorNote,
  StatusPill,
} from "@/components/ui/FormControls";
import {
  useCreateNotificationMessage,
  useDeleteNotificationMessage,
  useSetNotificationMessageStatus,
  useUpdateNotificationMessage,
} from "../hooks/useNotificationMutations";
import {
  useNotificationMessages,
  useTriggerCoverage,
} from "../hooks/useNotificationQueries";
import {
  NotificationForm,
  toDraft,
  toPayload,
  type NotificationDraft,
} from "./NotificationForm";

export function NotificationMessagesSection() {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const messages = useNotificationMessages("trigger");
  const coverage = useTriggerCoverage();
  const create = useCreateNotificationMessage();
  const update = useUpdateNotificationMessage();
  const remove = useDeleteNotificationMessage();
  const setStatus = useSetNotificationMessageStatus();

  const labelFor = (triggerId: string | null) =>
    coverage.data?.find((t) => t.id === triggerId)?.label ?? triggerId ?? "";

  const rows = messages.data ?? [];

  const handleCreate = (draft: NotificationDraft) => {
    create.mutate(toPayload(draft), { onSuccess: () => setCreating(false) });
  };

  const handleUpdate = (id: string, draft: NotificationDraft) => {
    update.mutate(
      { id, input: toPayload(draft) },
      { onSuccess: () => setEditingId(null) }
    );
  };

  return (
    <Card
      title="In-app notifications"
      description="What the bell shows when a trigger fires. Written the moment the event lands, not on a schedule."
      actions={
        !creating && (
          <Button type="button" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New notification
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {creating && (
          <NotificationForm
            submitLabel="Create"
            isPending={create.isPending}
            error={create.error}
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        )}

        <ErrorNote error={remove.error} />
        <ErrorNote error={setStatus.error} />

        {messages.isError ? (
          <ErrorNote error={new Error("Couldn't load notifications.")} />
        ) : messages.isPending ? (
          <div className="h-24 animate-pulse rounded-lg bg-white/5" />
        ) : rows.length === 0 ? (
          <p className="rounded-lg border border-white/5 bg-[#141414] px-3 py-6 text-center text-sm text-white/35">
            No in-app notifications yet. Every trigger needs one.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((m: NotificationMessage) => {
              const isEditing = editingId === m.id;
              // Editing live copy would change what an active trigger says
              // with no record of the switch, so the backend requires a pause
              // first and the button follows suit.
              const canEdit = m.status === "draft" || m.status === "paused";

              return (
                <li
                  key={m.id}
                  className="rounded-lg border border-white/5 bg-[#141414] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {m.name}
                        </span>
                        <StatusPill status={m.status} />
                        <span className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-xs text-white/50">
                          {labelFor(m.trigger_type)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/50">{m.title}</p>
                      <p className="mt-0.5 text-xs text-white/35">{m.body}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {m.status === "active" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate({ id: m.id, action: "pause" })
                          }
                        >
                          <Pause className="h-4 w-4" />
                          Pause
                        </Button>
                      ) : m.status === "archived" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate({ id: m.id, action: "unarchive" })
                          }
                        >
                          <ArchiveRestore className="h-4 w-4" />
                          Restore
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          disabled={setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate({ id: m.id, action: "activate" })
                          }
                        >
                          <Play className="h-4 w-4" />
                          Activate
                        </Button>
                      )}

                      {canEdit && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setEditingId(isEditing ? null : m.id)}
                        >
                          <Pencil className="h-4 w-4" />
                          {isEditing ? "Close" : "Edit"}
                        </Button>
                      )}

                      {m.status !== "archived" && m.status !== "active" && (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate({ id: m.id, action: "archive" })
                          }
                        >
                          <Archive className="h-4 w-4" />
                          Archive
                        </Button>
                      )}

                      {m.status === "draft" && (
                        <Button
                          type="button"
                          variant="danger"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(m.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-3">
                      <NotificationForm
                        initial={toDraft(m)}
                        submitLabel="Save"
                        isPending={update.isPending}
                        error={update.error}
                        onSubmit={(draft) => handleUpdate(m.id, draft)}
                        onCancel={() => setEditingId(null)}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
