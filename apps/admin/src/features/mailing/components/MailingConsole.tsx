"use client";

import { useState } from "react";
import { AutomationsSection } from "./AutomationsSection";
import { BroadcastComposer } from "./BroadcastComposer";
import { BroadcastHistory } from "./BroadcastHistory";
import { MailingOpsSection } from "./MailingOpsSection";
import { TemplatesSection } from "./TemplatesSection";
import { TriggersSection } from "./TriggersSection";

const TABS = [
  { id: "broadcasts", label: "Mass email" },
  { id: "automations", label: "Automations" },
  { id: "templates", label: "Templates" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function MailingConsole() {
  const [tab, setTab] = useState<TabId>("broadcasts");

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Mailing sections"
        className="flex flex-wrap gap-1 rounded-xl border border-white/5 bg-[#1C1C1C] p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-[#2A2A2A] text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "broadcasts" && (
        <>
          <BroadcastComposer />
          <BroadcastHistory />
        </>
      )}

      {tab === "automations" && (
        <>
          <TriggersSection />
          <AutomationsSection />
          <MailingOpsSection />
        </>
      )}

      {tab === "templates" && <TemplatesSection />}
    </div>
  );
}
