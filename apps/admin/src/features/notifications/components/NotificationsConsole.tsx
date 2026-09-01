"use client";

import { useState } from "react";
import { AutomationsSection } from "@/features/mailing/components/AutomationsSection";
import { AnnouncementComposer } from "./AnnouncementComposer";
import { AnnouncementHistory } from "./AnnouncementHistory";
import { NotificationMessagesSection } from "./NotificationMessagesSection";
import { NotificationOpsSection } from "./NotificationOpsSection";
import { NotificationStatisticsSection } from "./NotificationStatisticsSection";
import { TriggerCoverageSection } from "./TriggerCoverageSection";

const TABS = [
  { id: "triggers", label: "Triggers" },
  { id: "announcements", label: "Announcements" },
  { id: "statistics", label: "Statistics" },
  { id: "ops", label: "Jobs" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function NotificationsConsole() {
  const [tab, setTab] = useState<TabId>("triggers");

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Notification sections"
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

      {/* Both channels for a trigger are configured on one screen, so an admin
          wiring up an event does not have to remember the other half exists. */}
      {tab === "triggers" && (
        <>
          <TriggerCoverageSection />
          <NotificationMessagesSection />
          <AutomationsSection />
        </>
      )}

      {tab === "announcements" && (
        <>
          <AnnouncementComposer />
          <AnnouncementHistory />
        </>
      )}

      {tab === "statistics" && <NotificationStatisticsSection />}

      {tab === "ops" && <NotificationOpsSection />}
    </div>
  );
}
