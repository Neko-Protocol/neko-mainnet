"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const CONTROL_CLASS =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-[#229EDF] disabled:cursor-not-allowed disabled:opacity-50";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-white/50">{label}</span>
      {children}
      {hint && <span className="text-xs text-white/30">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={CONTROL_CLASS} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${CONTROL_CLASS} font-mono`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${CONTROL_CLASS} appearance-none pr-9`} />
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-white/40"
        aria-hidden
      />
    </div>
  );
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: InputHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
  type?: "button" | "submit";
}) {
  const styles: Record<string, string> = {
    primary: "bg-[#229EDF] text-white hover:bg-[#1B8AC6]",
    secondary: "bg-[#2A2A2A] text-white/80 hover:bg-[#333333]",
    danger: "bg-red-500/15 text-red-400 hover:bg-red-500/25",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  collapsible = false,
  open = true,
  onToggle,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-white/40">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {collapsible && (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </div>
    </div>
  );

  return (
    <section className="rounded-2xl border border-white/5 bg-[#1C1C1C] p-4 sm:p-5">
      {collapsible && onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="w-full text-left"
        >
          {header}
        </button>
      ) : (
        header
      )}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-white/10 text-white/60",
  sending: "bg-amber-500/15 text-amber-400",
  sent: "bg-emerald-500/15 text-emerald-400",
  failed: "bg-red-500/15 text-red-400",
  active: "bg-emerald-500/15 text-emerald-400",
  paused: "bg-amber-500/15 text-amber-400",
  archived: "bg-white/5 text-white/35",
  pending: "bg-white/10 text-white/60",
  skipped: "bg-white/5 text-white/35",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? "bg-white/10 text-white/60"
      }`}
    >
      {status}
    </span>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  return (
    <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
      {message}
    </p>
  );
}
