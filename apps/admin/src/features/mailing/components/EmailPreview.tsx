"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useEmailPreview } from "../hooks/useEmailPreview";
import { Button } from "./MailingFormControls";

/**
 * Renders the real branded email in a sandboxed iframe.
 *
 * `sandbox` is set with no allow-* tokens, so the admin-authored HTML is
 * rendered but cannot run scripts, submit forms, or navigate the parent.
 * template markup is trusted-ish input, but it shouldn't get script execution
 * inside an authenticated admin origin.
 */
export function EmailPreview({
  bodyHtml,
  label = "Preview",
  defaultOpen = false,
}: {
  bodyHtml: string;
  label?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [debounced, setDebounced] = useState(bodyHtml);

  // Keeps the preview from re-rendering on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(bodyHtml), 400);
    return () => clearTimeout(id);
  }, [bodyHtml]);

  const { data, isPending, isError } = useEmailPreview(debounced, open);
  const hasBody = bodyHtml.trim().length > 0;

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={!hasBody}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {open ? `Hide ${label.toLowerCase()}` : label}
      </Button>

      {open && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          {isError ? (
            <p className="p-4 text-sm text-red-400">
              Couldn&apos;t render the preview.
            </p>
          ) : isPending ? (
            <div className="h-64 animate-pulse bg-white/5" />
          ) : (
            <iframe
              title={`${label} of the email as it will be sent`}
              sandbox=""
              srcDoc={data?.html ?? ""}
              className="h-[520px] w-full border-0 bg-[#0d0d0f]"
            />
          )}
        </div>
      )}
    </div>
  );
}
