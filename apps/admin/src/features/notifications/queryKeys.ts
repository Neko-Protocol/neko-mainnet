export const notificationKeys = {
  all: ["notifications"] as const,
  triggers: ["notifications", "triggers"] as const,
  messages: (kind?: "trigger" | "announcement") =>
    ["notifications", "messages", kind ?? "all"] as const,
  audiencePreview: (audience: string) =>
    ["notifications", "audience-preview", audience] as const,
  stats: ["notifications", "stats"] as const,
};
