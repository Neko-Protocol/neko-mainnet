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
  {
    id: "tokenized-fund",
    label: "Tokenized Funds",
    description: "Regulated fund shares issued on-chain (RWA)",
  },
  {
    id: "structured-credit",
    label: "Structured Credit",
    description: "Tokenized pools of corporate loans (RWA)",
  },
  {
    id: "commodity",
    label: "Commodities",
    description: "Tokenized physical commodities (RWA)",
  },
  { id: "native", label: "Native", description: "Network-native assets" },
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
  "tokenized-fund": {
    title: "What is a tokenized fund?",
    body: "A tokenized fund is a share of a regulated investment fund issued directly on-chain, where the token itself is the record of ownership rather than an IOU for one. The fund holds conventional assets, typically short-term government debt, and a transfer agent keeps the on-chain register in sync with the fund's books. Some share classes are restricted to investors the issuer has approved, so they can be tracked but not freely traded.",
  },
  commodity: {
    title: "What is a tokenized commodity?",
    body: "A tokenized commodity represents ownership of a physical asset, such as gold, held in professional vaults, wrapped into an on-chain token. Each token is redeemable against the underlying reserve, which is verified by independent audits, so holders get commodity price exposure with the liquidity and 24/7 transferability of a digital asset.",
  },
  "structured-credit": {
    title: "What is structured credit?",
    body: "Structured credit pools many corporate loans into a single vehicle and splits the repayments into tranches ranked by who gets paid first. The AAA tranche sits at the top, absorbing losses last, which is why it carries the highest credit rating in the structure. Tokenizing that tranche puts an institutional fixed-income product on-chain, though the rating describes credit risk only, not price stability.",
  },
};
