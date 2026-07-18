export type AssetClass =
  | "native"
  | "stablecoin"
  | "sovereign-bond"
  | "tokenized-fund"
  | "structured-credit";

export interface AssetTaxonomy {
  /** Broad category used for filtering on the discover page. */
  class: AssetClass;
  /** Human-readable label, e.g. "Stablecoin", "Sovereign Bond". */
  classLabel: string;
  /** Issuer / brand behind the token, e.g. "Circle", "Etherfuse". */
  issuer?: string;
  /**
   * Transfers are restricted to allowlisted holders — the asset is shown for
   * reference and price discovery, but cannot be bought or swapped in-app.
   * Mirrors `AssetConfig.isInstitutional` from the keeper registry.
   */
  institutional?: boolean;
  /** Currency the asset is pegged to (stablecoins only). */
  peg?: "USD" | "EUR" | "JPY" | "KRW" | "BRL" | "MXN";
  /** ISO country / region code where applicable. */
  region?: string;
  /** Whether the token accrues yield natively (rebasing or interest-bearing). */
  yieldBearing?: boolean;
}

export interface AssetInfo {
  logo: string;
  name: string;
  description: string;

  summary?: string;

  /** Short bulleted highlights shown on the asset detail page. */
  highlights?: string[];

  /** Optional taxonomy used for filtering and detail display. */
  taxonomy?: AssetTaxonomy;

  buyInfo?: {
    platform: string;
    url: string;

    description?: string;
  };
}
