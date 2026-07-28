"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteMailingTemplate } from "@/lib/mailing";

function deleteErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "TEMPLATE_IN_USE") {
      return "This template is used by one or more automations and cannot be deleted.";
    }
    return err.message;
  }
  return "Failed to delete template.";
}

export function DeleteTemplateButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteMailingTemplate(id);
      router.refresh();
    } catch (err) {
      setError(deleteErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={deleting}
        className="text-red-400 hover:text-red-300 hover:underline disabled:opacity-60"
      >
        {deleting ? "Deleting…" : "Delete"}
      </button>
      {error ? (
        <span className="max-w-xs text-xs text-red-300">{error}</span>
      ) : null}
    </span>
  );
}
