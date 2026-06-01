export const toSmallestUnit = (
  amount: string | number,
  decimals: number = 7
): string => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "0";
  return Math.floor(numAmount * Math.pow(10, decimals)).toString();
};

export const fromSmallestUnit = (
  amount: string,
  decimals: number = 7
): string => {
  const numAmount = BigInt(amount);
  const divisor = BigInt(Math.pow(10, decimals));
  const whole = numAmount / divisor;
  const fractional = numAmount % divisor;
  if (fractional === BigInt(0)) return whole.toString();
  const fractionalStr = fractional.toString().padStart(decimals, "0");
  return `${whole}.${fractionalStr.replace(/0+$/, "")}`;
};
