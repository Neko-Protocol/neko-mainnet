export function generateRateHistory(
  baseRate: number,
  formatDate: (date: Date) => string,
  days = 7,
  points = 84
): { date: string; value: number }[] {
  const now = Date.now();
  const step = (days * 24 * 60 * 60 * 1000) / points;
  const raw: number[] = [baseRate * (1 + (Math.random() - 0.5) * 0.3)];
  for (let i = 1; i <= points; i++) {
    const prev = raw[i - 1];
    const revert = (baseRate - prev) * 0.08;
    const noise = (Math.random() - 0.5) * baseRate * 0.06;
    raw.push(Math.max(0.01, prev + revert + noise));
  }
  raw[raw.length - 1] = baseRate;

  return raw.map((value, i) => {
    const ts = now - (points - i) * step;
    const d = new Date(ts);
    return { date: formatDate(d), value: parseFloat(value.toFixed(4)) };
  });
}
