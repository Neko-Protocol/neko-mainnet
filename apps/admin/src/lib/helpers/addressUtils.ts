export function truncateAddress(value: string, start = 4, end = 4): string {
  if (value.length <= start + end) return value;
  return `${value.slice(0, start)}…${value.slice(-end)}`;
}
