export const ETHERFUSE_BOND_SYMBOLS = ["CETES", "USTRY", "TESOURO"] as const;

export type EtherfuseBondSymbol = (typeof ETHERFUSE_BOND_SYMBOLS)[number];

export const FALLBACK_APY: Record<EtherfuseBondSymbol, number> = {
  CETES: 9.5,
  USTRY: 4.8,
  TESOURO: 13.5,
};

export const FALLBACK_CURRENCY: Record<EtherfuseBondSymbol, string> = {
  CETES: "MXN",
  USTRY: "USD",
  TESOURO: "BRL",
};
