export function horizonNativeBalanceToStroops(balanceStr: string): bigint {
  const t = balanceStr.trim();
  if (!t) return 0n;
  const [w, frac = ""] = t.split(".");
  const whole = w === "" ? "0" : w;
  const f = (frac + "0000000").slice(0, 7);
  return BigInt(whole) * 10_000_000n + BigInt(f.padStart(7, "0"));
}


// Stellar account minimum balance (classic): (2 + subentries) × base reserve.
// Mainnet base reserve = 0.5 XLM.

const STELLAR_BASE_RESERVE_STROOPS = 5_000_000n;

// Buffer for Soroban base fee + headroom (stroops).
const DEFAULT_SOROBAN_FEE_BUFFER_STROOPS = 2_000_000n;

export function ledgerMinBalanceStroops(subentryCount: number): bigint {
  return BigInt(2 + subentryCount) * STELLAR_BASE_RESERVE_STROOPS;
}

// Native XLM that can be spent without dropping below minimum reserve (minus fee buffer).
export function spendableNativeStroops(
  nativeBalanceStroops: bigint,
  subentryCount: number,
  feeBufferStroops: bigint = DEFAULT_SOROBAN_FEE_BUFFER_STROOPS
): bigint {
  const min = ledgerMinBalanceStroops(subentryCount);
  const s = nativeBalanceStroops - min - feeBufferStroops;
  return s > 0n ? s : 0n;
}
