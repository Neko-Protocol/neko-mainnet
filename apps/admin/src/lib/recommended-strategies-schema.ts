/** Pure types/constants for recommended strategies (safe for client UI). */

export type DestinationKind = "pool" | "vault" | "yield-token";

export type RecommendedStrategy = {
  id: string;
  name: string;
  description: string | null;
  token_code: string;
  destination_kind: DestinationKind;
  destination_id: string;
  stack_kind: DestinationKind | null;
  stack_id: string | null;
  amount: number | null;
  snapshot_apy: number | null;
  position: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogDestination = {
  kind: DestinationKind;
  id: string;
  name: string;
  protocol: string;
  apy: number | null;
  acceptedTokenCodes: string[];
};

const DESTINATION_KIND_SET = new Set<string>(["pool", "vault", "yield-token"]);

export function isDestinationKind(x: string): x is DestinationKind {
  return DESTINATION_KIND_SET.has(x);
}

export function encodeDestinationValue(
  kind: DestinationKind,
  id: string
): string {
  return `${kind}:${id}`;
}

export function decodeDestinationValue(
  value: string
): { kind: DestinationKind; id: string } | null {
  const idx = value.indexOf(":");
  if (idx <= 0) return null;
  const kind = value.slice(0, idx);
  const id = value.slice(idx + 1);
  if (!id || !isDestinationKind(kind)) return null;
  return { kind, id };
}
