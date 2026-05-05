export function trimBalance(value: string): string {
  const n = parseFloat(value);
  if (isNaN(n)) return value;
  if (n === 0) return "0";
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

export const PAGE_SIZE = 10;

export function formatTs(ts: number): string {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export const EVENT_TYPE_COLORS: Record<string, string> = {
  supply: "text-emerald-400",
  supply_collateral: "text-emerald-400",
  withdraw: "text-orange-400",
  withdraw_collateral: "text-orange-400",
  borrow: "text-purple-400",
  repay: "text-teal-400",
  swap: "text-blue-400",
  deposit: "text-blue-400",
  claim: "text-yellow-400",
};

export const BLEND_MIN_COLLATERAL_USD = 5;
