export type EtherfuseBondSymbol = "CETES" | "USTRY" | "TESOURO";

export interface EtherfuseYieldEntry {
  symbol: EtherfuseBondSymbol;
  apy: number;
  currency: string;
  lastUpdated: string;
}
