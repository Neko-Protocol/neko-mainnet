const BPS_DENOMINATOR = 10_000n;

export function decimalToAtomic(value: string | number, decimals = 7): bigint {
  const raw = String(value).trim().replace(/,/g, "");
  if (!raw || raw === ".") return 0n;
  if (!/^\d*(?:\.\d*)?$/.test(raw)) {
    throw new Error(`Invalid amount: ${value}`);
  }

  const [integerPartRaw = "0", fractionPartRaw = ""] = raw.split(".");
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/, "") || "0";
  const fractionPart = fractionPartRaw.slice(0, decimals).padEnd(decimals, "0");
  const digits = `${integerPart}${fractionPart}`.replace(/^0+(?=\d)/, "");
  return BigInt(digits || "0");
}

export function atomicToDecimal(value: bigint | string, decimals = 7): string {
  const amount = typeof value === "bigint" ? value : BigInt(value);
  if (amount === 0n) return "0";

  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  if (fraction === 0n) return whole.toString();

  const fractionText = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");
  return `${whole.toString()}.${fractionText}`;
}

export function mulDivFloor(a: bigint, b: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new Error("mulDivFloor denominator must be positive");
  }
  return (a * b) / denominator;
}

export function mulDivCeil(a: bigint, b: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new Error("mulDivCeil denominator must be positive");
  }
  const product = a * b;
  return product === 0n ? 0n : (product + denominator - 1n) / denominator;
}

export function applySlippageBps(amount: bigint, slippageBps: number): bigint {
  if (slippageBps < 0 || slippageBps > Number(BPS_DENOMINATOR)) {
    throw new Error("Invalid slippage bps");
  }
  return (amount * (BPS_DENOMINATOR - BigInt(slippageBps))) / BPS_DENOMINATOR;
}
