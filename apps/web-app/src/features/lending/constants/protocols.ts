/** Orchestrator pool types + native Neko lending contracts. */
export const LENDING_PROTOCOL_ORDER = [
  "neko",
  "aqua",
  "soroswap",
  "blend",
  "custom",
] as const;

export const LENDING_PROTOCOL_LABELS: Record<string, string> = {
  neko: "Neko",
  aqua: "Aqua",
  soroswap: "Soroswap",
  blend: "Blend",
  custom: "Custom",
};

export function lendingProtocolLabel(id: string): string {
  return LENDING_PROTOCOL_LABELS[id] ?? id;
}
