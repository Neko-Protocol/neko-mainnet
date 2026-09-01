"use client";

import { useEffect, useState } from "react";

export interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

/** Matches the web-app's "Change app mode?" confirm dialog styling, with a
 * real fade/slide entrance (no tailwindcss-animate plugin in this app). */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm transition-opacity duration-200 ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      onClick={onCancel}
    >
      <div
        className={`w-full max-w-sm rounded-2xl border border-white/10 bg-[#161616] p-6 shadow-2xl transition-all duration-300 ${
          entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <p className="mb-1 text-base font-semibold text-white">{title}</p>
        <p className="mb-6 text-sm leading-relaxed text-white/50">
          {description}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-white/6 py-2.5 text-sm font-semibold text-white/60 transition-colors hover:bg-white/10"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors ${
              variant === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#229EDF] hover:bg-[#1a8bc7]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
