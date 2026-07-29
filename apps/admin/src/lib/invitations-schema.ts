/** Pure types/constants for invitations (safe to import from client UI). */

export const INVITATION_TYPES = [
  { id: "user", label: "User", color: "var(--color-neko-blue)" },
  { id: "beta", label: "Beta Tester", color: "var(--color-neko-muted)" },
  { id: "vip", label: "VIP", color: "var(--color-neko-cream)" },
  { id: "partner", label: "Partner", color: "var(--color-neko-accent)" },
  { id: "press", label: "Press / Media", color: "var(--color-neko-border)" },
] as const;

export type InvitationType = (typeof INVITATION_TYPES)[number]["id"];

export type InvitationStatus = "pending" | "accepted" | "expired";

export type Invitation = {
  id: string;
  email: string;
  type: InvitationType;
  token: string;
  status: InvitationStatus;
  assigned_to: string | null;
  notes: string | null;
  created_by: string | null;
  strategy_id: string | null;
  accepted_at: string | null;
  accepted_notes: string | null;
  volume_moved: number | null;
  expires_at: string;
  created_at: string;
};

const TYPE_SET = new Set<string>(INVITATION_TYPES.map((t) => t.id));

export function isInvitationType(x: string): x is InvitationType {
  return TYPE_SET.has(x);
}
