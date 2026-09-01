"use client";

import { useState } from "react";
import { BroadcastComposer } from "./BroadcastComposer";
import { MailingOpsSection } from "./MailingOpsSection";
import { StatisticsSection } from "./StatisticsSection";
import { TemplatesSection } from "./TemplatesSection";

// Triggered automations moved to the Notifications console, where they sit
// beside the in-app half of the same trigger. What is left here is the mass
// email side: one-off sends and the templates they draw on.
const TABS = [
  { id: "broadcasts", label: "Mass email" },
  { id: "templates", label: "Templates" },
  { id: "statistics", label: "Statistics" },
  { id: "ops", label: "Jobs" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function MailingConsole() {
  const [tab, setTab] = useState<TabId>("broadcasts");

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Mailing sections"
          className="inline-flex max-w-full flex-wrap justify-center gap-1 rounded-xl border border-white/5 bg-[#1C1C1C] p-1"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-[#2A2A2A] text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "broadcasts" && <BroadcastComposer />}

      {tab === "templates" && <TemplatesSection />}

      {tab === "statistics" && <StatisticsSection />}

      {tab === "ops" && <MailingOpsSection />}
    </div>
  );
}
