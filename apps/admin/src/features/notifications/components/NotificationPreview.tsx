"use client";

import { AlertCircle, Bell, Gift, Settings2 } from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  activity: Bell,
  reward: Gift,
  system: Settings2,
  alert: AlertCircle,
};

const ACCENTS: Record<string, string> = {
  activity: "bg-[#229EDF]/15 text-[#229EDF]",
  reward: "bg-emerald-400/15 text-emerald-400",
  system: "bg-white/10 text-white/60",
  alert: "bg-amber-400/15 text-amber-400",
};

/**
 * Mirrors the web app's NotificationItem closely enough to judge whether the
 * copy fits. Rendered here rather than round-tripped through the backend the
 * way EmailPreview is: there is no template shell to apply, so the only thing
 * a server render would add is latency.
 */
export function NotificationPreview({
  title,
  body,
  category,
}: {
  title: string;
  body: string;
  category: string;
}) {
  const Icon = ICONS[category] ?? Bell;
  const accent = ACCENTS[category] ?? ACCENTS.activity;

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-white/50">Preview</p>
      <div className="max-w-sm rounded-2xl border border-white/10 bg-[#1A1A1A] p-2">
        <div className="flex gap-3 rounded-xl bg-white/[0.04] px-3 py-3">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${accent}`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <span className="flex-1 text-sm font-semibold text-white">
                {title || "Title goes here"}
              </span>
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#229EDF]" />
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-white/60">
              {body || "Body text goes here."}
            </p>
            <p className="mt-1 text-[11px] text-white/35">just now</p>
          </div>
        </div>
      </div>
    </div>
  );
}
