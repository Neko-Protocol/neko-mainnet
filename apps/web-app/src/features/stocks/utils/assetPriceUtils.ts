export function formatUsdPrice(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "No data";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: n < 0.01 ? 6 : 4,
  }).format(n);
}

export function calculatePriceChange(
  current: number,
  previous: number
): number | null {
  if (
    previous === 0 ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous)
  ) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}
