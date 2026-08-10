import type { AssetClass, AssetTaxonomy } from "../types/discover";

/** Static taxonomy keyed by token code (uppercase). */
export const ASSET_TAXONOMY: Record<string, AssetTaxonomy> = {
  XLM: {
    class: "native",
    classLabel: "Native",
  },
  USDC: {
    class: "stablecoin",
    classLabel: "Stablecoin",
    issuer: "Circle",
    peg: "USD",
  },
  EURC: {
    class: "stablecoin",
    classLabel: "Stablecoin",
    issuer: "Circle",
    peg: "EUR",
  },
  PYUSD: {
    class: "stablecoin",
    classLabel: "Stablecoin",
    issuer: "PayPal / Paxos",
    peg: "USD",
  },
  USDY: {
    class: "stablecoin",
    classLabel: "Yield Stablecoin",
    issuer: "Ondo Finance",
    peg: "USD",
    yieldBearing: true,
  },
  GYEN: {
    class: "stablecoin",
    classLabel: "Stablecoin",
    issuer: "GMO Trust",
    peg: "JPY",
  },
  USTRY: {
    class: "sovereign-bond",
    classLabel: "Sovereign Bond",
    issuer: "Etherfuse",
    region: "US",
    yieldBearing: true,
  },
  TESOURO: {
    class: "sovereign-bond",
    classLabel: "Sovereign Bond",
    issuer: "Etherfuse",
    region: "BR",
    yieldBearing: true,
  },
  CETES: {
    class: "sovereign-bond",
    classLabel: "Sovereign Bond",
    issuer: "Etherfuse",
    region: "MX",
    yieldBearing: true,
  },
  BENJI: {
    class: "tokenized-fund",
    classLabel: "Money Market Fund",
    issuer: "Franklin Templeton",
    region: "US",
    yieldBearing: true,
    institutional: true,
  },
  JTRSY: {
    class: "tokenized-fund",
    classLabel: "Treasury Fund",
    issuer: "Janus Henderson / Anemoy",
    region: "US",
    yieldBearing: true,
    institutional: true,
  },
  DEJTRSY: {
    class: "tokenized-fund",
    classLabel: "Treasury Fund",
    issuer: "Centrifuge",
    region: "US",
    yieldBearing: true,
  },
  JAAA: {
    class: "structured-credit",
    classLabel: "AAA CLO Fund",
    issuer: "Janus Henderson / Anemoy",
    region: "US",
    yieldBearing: true,
    institutional: true,
  },
  DEJAAA: {
    class: "structured-credit",
    classLabel: "AAA CLO Fund",
    issuer: "Centrifuge",
    region: "US",
    yieldBearing: true,
  },
  // XAUM: {
  //   class: "commodity",
  //   classLabel: "Tokenized Gold",
  //   issuer: "Matrixdock",
  // },
};

export function getAssetTaxonomy(code: string): AssetTaxonomy | undefined {
  return ASSET_TAXONOMY[code.toUpperCase()];
}

/**
 * Maps the literal English `classLabel` values above to
 * `sharedDiscover.classLabels` translation keys. classLabel itself stays
 * English-only data (consumed by features/basic and features/simulator too,
 * out of scope for this pass) — only the shared/discover consumers that
 * already call useTranslations look values up through this map.
 */
export const CLASS_LABEL_KEYS: Record<string, string> = {
  Native: "native",
  Stablecoin: "stablecoin",
  "Yield Stablecoin": "yieldStablecoin",
  "Sovereign Bond": "sovereignBond",
  "Money Market Fund": "moneyMarketFund",
  "Treasury Fund": "treasuryFund",
  "AAA CLO Fund": "aaaCloFund",
};

export interface AssetClassDef {
  id: AssetClass | "all";
  /** Translation key into sharedDiscover.classFilters.<labelKey>. */
  labelKey: string;
  /** Translation key into sharedDiscover.classFilters.<descriptionKey>. */
  descriptionKey: string;
}

export const ASSET_CLASS_FILTERS: AssetClassDef[] = [
  { id: "all", labelKey: "all", descriptionKey: "allDescription" },
  {
    id: "stablecoin",
    labelKey: "stablecoin",
    descriptionKey: "stablecoinDescription",
  },
  {
    id: "sovereign-bond",
    labelKey: "sovereignBond",
    descriptionKey: "sovereignBondDescription",
  },
  {
    id: "tokenized-fund",
    labelKey: "tokenizedFund",
    descriptionKey: "tokenizedFundDescription",
  },
  {
    id: "structured-credit",
    labelKey: "structuredCredit",
    descriptionKey: "structuredCreditDescription",
  },
  {
    id: "commodity",
    labelKey: "commodity",
    descriptionKey: "commodityDescription",
  },
  { id: "native", labelKey: "native", descriptionKey: "nativeDescription" },
];

/** Visual accents per class, used by cards and badges. */
export const CLASS_ACCENT: Record<
  AssetClass,
  { bg: string; text: string; ring: string; chip: string }
> = {
  native: {
    bg: "bg-sky-500/12",
    text: "text-sky-300",
    ring: "ring-sky-500/30",
    chip: "bg-sky-500/18 text-sky-300",
  },
  stablecoin: {
    bg: "bg-cyan-500/12",
    text: "text-cyan-300",
    ring: "ring-cyan-500/30",
    chip: "bg-cyan-500/18 text-cyan-300",
  },
  "sovereign-bond": {
    bg: "bg-blue-500/12",
    text: "text-blue-300",
    ring: "ring-blue-500/30",
    chip: "bg-blue-500/18 text-blue-300",
  },
  "tokenized-fund": {
    bg: "bg-violet-500/12",
    text: "text-violet-300",
    ring: "ring-violet-500/30",
    chip: "bg-violet-500/18 text-violet-300",
  },
  "structured-credit": {
    bg: "bg-amber-500/12",
    text: "text-amber-300",
    ring: "ring-amber-500/30",
    chip: "bg-amber-500/18 text-amber-300",
  },
  commodity: {
    bg: "bg-yellow-500/12",
    text: "text-yellow-300",
    ring: "ring-yellow-500/30",
    chip: "bg-yellow-500/18 text-yellow-300",
  },
};

/**
 * Translation key into sharedDiscover.classExplanations.<key> for each asset
 * class's plain-language explanation, shown on detail pages. The prose
 * itself lives in messages/{en,es}/sharedDiscover.json, not here.
 */
export const CLASS_EXPLANATION_KEYS: Record<AssetClass, string> = {
  native: "native",
  stablecoin: "stablecoin",
  "sovereign-bond": "sovereignBond",
  "tokenized-fund": "tokenizedFund",
  commodity: "commodity",
  "structured-credit": "structuredCredit",
};
