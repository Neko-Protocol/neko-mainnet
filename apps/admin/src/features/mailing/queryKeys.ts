import type {
  MailingAudienceId,
  MailingMessageKind,
} from "@neko-protocol/api-contracts";

export const mailingKeys = {
  audiences: ["mailing", "audiences"] as const,
  triggers: ["mailing", "triggers"] as const,
  audiencePreview: (audience: MailingAudienceId) =>
    ["mailing", "audience-preview", audience] as const,
  messages: (kind?: MailingMessageKind) =>
    ["mailing", "messages", kind ?? "all"] as const,
  messageSends: (id: string) => ["mailing", "message-sends", id] as const,
  messageStats: (id: string) => ["mailing", "message-stats", id] as const,
  templates: ["mailing", "templates"] as const,
  stats: ["mailing", "stats"] as const,
};
