/** Pure types/constants for strategies (safe to import from client UI). */

export const STRATEGY_TYPES = [
  {
    id: "acquisition",
    label: "User Acquisition",
    color: "var(--color-neko-blue)",
  },
  {
    id: "partnership",
    label: "Partnership",
    color: "var(--color-neko-accent)",
  },
  { id: "beta", label: "Beta Program", color: "var(--color-neko-muted)" },
  { id: "vip", label: "VIP / High-value", color: "var(--color-neko-cream)" },
  { id: "press", label: "Press & Media", color: "var(--color-neko-border)" },
  {
    id: "reactivation",
    label: "Reactivation",
    color: "var(--color-neko-navy-hover)",
  },
] as const;

export type StrategyType = (typeof STRATEGY_TYPES)[number]["id"];
export type StrategyStatus = "active" | "paused" | "completed";

export type Strategy = {
  id: string;
  name: string;
  description: string | null;
  type: StrategyType;
  target_count: number;
  target_volume: number;
  status: StrategyStatus;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type StrategyWithStats = Strategy & {
  total_invitations: number;
  pending: number;
  accepted: number;
  expired: number;
  acceptance_rate: number;
  total_volume_moved: number;
};

const TYPE_SET = new Set<string>(STRATEGY_TYPES.map((t) => t.id));
const STATUS_SET = new Set<StrategyStatus>(["active", "paused", "completed"]);

export function isStrategyType(x: string): x is StrategyType {
  return TYPE_SET.has(x);
}

export function isStrategyStatus(x: string): x is StrategyStatus {
  return STATUS_SET.has(x as StrategyStatus);
}
