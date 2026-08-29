import type { MailingAudienceId } from "@neko/api-contracts";

export const mailingKeys = {
  audiences: ["mailing", "audiences"] as const,
  audiencePreview: (audience: MailingAudienceId) =>
    ["mailing", "audience-preview", audience] as const,
  broadcasts: ["mailing", "broadcasts"] as const,
  broadcast: (id: string) => ["mailing", "broadcast", id] as const,
  templates: ["mailing", "templates"] as const,
  triggers: ["mailing", "triggers"] as const,
  automations: ["mailing", "automations"] as const,
  automationRuns: (id: string) => ["mailing", "automation-runs", id] as const,
  automationStats: (id: string) => ["mailing", "automation-stats", id] as const,
};
