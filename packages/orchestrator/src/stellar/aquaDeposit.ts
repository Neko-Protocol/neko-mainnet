/** Aqua API can return integer stroops as floats, e.g. "41211365815358.0000000" */
export function reserveStroopsFromApiString(s: string): bigint {
  const t = s.trim();
  if (!t) return 0n;
  const dot = t.indexOf(".");
  const intPart = dot === -1 ? t : t.slice(0, dot);
  const digits = intPart.replace(/\D/g, "");
  if (!digits) return 0n;
  try {
    return BigInt(digits);
  } catch {
    return 0n;
  }
}

export function aquaProportionalAmountB(
  amountA: bigint,
  reserves: string[]
): bigint {
  if (reserves.length < 2) return amountA;
  const reserveA = reserveStroopsFromApiString(reserves[0]);
  const reserveB = reserveStroopsFromApiString(reserves[1]);
  if (reserveA <= 0n || reserveB <= 0n) return amountA;
  return (amountA * reserveB * 101n) / (reserveA * 100n);
}
