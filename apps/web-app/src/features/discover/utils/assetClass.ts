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
  KTB: {
    class: "sovereign-bond",
    classLabel: "Sovereign Bond",
    issuer: "Etherfuse / Shinhan",
    region: "KR",
    yieldBearing: true,
  },
};

export function getAssetTaxonomy(code: string): AssetTaxonomy | undefined {
  return ASSET_TAXONOMY[code.toUpperCase()];
}

export interface AssetClassDef {
  id: AssetClass | "all";
  label: string;
  description: string;
}

export const ASSET_CLASS_FILTERS: AssetClassDef[] = [
  { id: "all", label: "All", description: "Every supported asset" },
  {
    id: "stablecoin",
    label: "Stablecoins",
    description: "Fiat-pegged digital currencies",
  },
  {
    id: "sovereign-bond",
    label: "Sovereign Bonds",
    description: "Tokenized government debt (RWA)",
  },
  { id: "native", label: "Native", description: "Network-native assets" },
];

/** Visual accents per class, used by cards and badges. */
export const CLASS_ACCENT: Record<
  AssetClass,
  { bg: string; text: string; ring: string; chip: string }
> = {
  native: {
    bg: "bg-[#229EDF]/10",
    text: "text-[#229EDF]",
    ring: "ring-[#229EDF]/30",
    chip: "bg-[#229EDF]/15 text-[#229EDF]",
  },
  stablecoin: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    ring: "ring-emerald-500/30",
    chip: "bg-emerald-500/15 text-emerald-300",
  },
  "sovereign-bond": {
    bg: "bg-amber-500/10",
    text: "text-amber-300",
    ring: "ring-amber-500/30",
    chip: "bg-amber-500/15 text-amber-300",
  },
};

/** Plain-language explanation of each asset class, shown on detail pages. */
export const CLASS_EXPLANATIONS: Record<
  AssetClass,
  { title: string; body: string }
> = {
  native: {
    title: "What is a native asset?",
    body: "A native asset is the built-in currency of a blockchain, it isn't issued by a company or backed by an off-chain reserve. It pays for transaction fees, secures the network, and acts as a bridge between other assets traded on-chain.",
  },
  stablecoin: {
    title: "What is a stablecoin?",
    body: "A stablecoin is a token designed to track the value of a reference currency such as the US dollar or the euro. Issuers hold reserves (cash, short-term government debt, or other safe instruments) so that each token can be redeemed 1:1, giving holders price stability with the speed and global reach of blockchain settlement.",
  },
  "sovereign-bond": {
    title: "What is a tokenized sovereign bond?",
    body: "A tokenized sovereign bond represents a share of debt issued by a national government,for instance, US Treasuries or Mexican Government Bonds, wrapped into an on-chain token. Holders earn the underlying yield while keeping the liquidity and 24/7 transferability of a digital asset.",
  },
};
