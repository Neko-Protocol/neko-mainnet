export interface ReflectorAsset {
  tag: "Stellar" | "Other";
  value: string;
}

export type AssetPriceSource = "reflector" | "soroswap" | "coingecko";

export interface AssetConfig {
  code: string;
  name: string;
  contract: string;
  decimals: number;
  icon: string;
  priceSource: AssetPriceSource;
  isStablecoin?: boolean;
  /**
   * CoinGecko `/simple/price` id (e.g. `stellar`, `usd-coin`).
   * Used only when Soroswap returns no price — not a substitute for on-chain parity.
   */
  coinGeckoId?: string;
  /**
   * SEP-40 asset identifier as tracked by the Reflector oracle.
   * If set, StellarPriceService queries Reflector first (mainnet only).
   * `Stellar` = SAC contract address; `Other` = symbol (e.g. "BTC").
   */
  reflectorAsset?: ReflectorAsset;
}

type NetworkId = "testnet" | "standalone" | "mainnet";

const ASSETS_BY_NETWORK: Record<NetworkId, Record<string, AssetConfig>> = {
  testnet: {},
  standalone: {
    XLM: {
      code: "XLM",
      name: "Stellar Lumens",
      contract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
      decimals: 7,
      icon: "/assets/xlm-logo.png",
      priceSource: "soroswap",
      coinGeckoId: "stellar",
    },
    USDC: {
      code: "USDC",
      name: "USD Coin",
      contract: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
      decimals: 7,
      icon: "/assets/usdc-logo.png",
      priceSource: "soroswap",
      isStablecoin: true,
      coinGeckoId: "usd-coin",
    },
  },
  mainnet: {
    CETES: {
      code: "CETES",
      name: "Mexican Treasury Token",
      contract: "CAL6ER2TI6CTRAY6BFXWNWA7WTYXUXTQCHUBCIBU5O6KM3HJFG6Z6VXV",
      decimals: 7,
      icon: "https://stablebonds.s3.us-west-2.amazonaws.com/stablebond/spl-cetes.png",
      priceSource: "reflector",
      isStablecoin: false,
      coinGeckoId: "etherfuse-cetes",
      reflectorAsset: {
        tag: "Stellar",
        value: "CAL6ER2TI6CTRAY6BFXWNWA7WTYXUXTQCHUBCIBU5O6KM3HJFG6Z6VXV",
      },
    },
    USDY: {
      code: "USDY",
      name: "US Dollar Yield",
      contract: "CB3YA656OYIHU57657I5KGSBRHE5I3OZU4VFC22PYAOANFZHEWNYGAGP",
      decimals: 7,
      icon: "/assets/usdy-logo.png",
      priceSource: "soroswap",
      isStablecoin: true,
      coinGeckoId: "ondo-us-dollar-yield",
    },
    USDC: {
      code: "USDC",
      name: "USD Coin",
      contract: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
      decimals: 7,
      icon: "/assets/usdc-logo.png",
      priceSource: "reflector",
      isStablecoin: true,
      coinGeckoId: "usd-coin",
      reflectorAsset: {
        tag: "Stellar",
        value: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
      },
    },
    XLM: {
      code: "XLM",
      name: "Stellar Lumens",
      contract: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
      decimals: 7,
      icon: "/assets/xlm-logo.png",
      priceSource: "reflector",
      coinGeckoId: "stellar",
      reflectorAsset: {
        tag: "Stellar",
        value: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
      },
    },
    EURC: {
      code: "EURC",
      name: "EUR Coin",
      contract: "CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV",
      decimals: 7,
      icon: "https://ipfs.io/ipfs/bafkreidizqlammdzrrurfq3o5owta77fiyonn6ri72h6rltqimn2xs2by4",
      priceSource: "reflector",
      isStablecoin: true,
      coinGeckoId: "eurc",
      reflectorAsset: {
        tag: "Stellar",
        value: "CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV",
      },
    },
    USTRY: {
      code: "USTRY",
      name: "US Treasury Token",
      contract: "CBLV4ATSIWU67CFSQU2NVRKINQIKUZ2ODSZBUJTJ43VJVRSBTZYOPNUR",
      decimals: 7,
      icon: "https://stablebonds.s3.us-west-2.amazonaws.com/stablebond/spl-ustry.png",
      priceSource: "reflector",
      isStablecoin: false,
      coinGeckoId: "etherfuse-ustry",
      reflectorAsset: {
        tag: "Stellar",
        value: "CBLV4ATSIWU67CFSQU2NVRKINQIKUZ2ODSZBUJTJ43VJVRSBTZYOPNUR",
      },
    },
    TESOURO: {
      code: "TESOURO",
      name: "Brazilian Bonds Token",
      contract: "CD6M4R2322BYCY2LNWM74PEBQAQ63SA3DUJLI3L4225U4ZVCLMSCBCIS",
      decimals: 7,
      icon: "https://stablebonds.s3.us-west-2.amazonaws.com/stablebond/spl-tesouro.png",
      priceSource: "reflector",
      isStablecoin: false,
      coinGeckoId: "etherfuse-tesouro",
      reflectorAsset: {
        tag: "Stellar",
        value: "CD6M4R2322BYCY2LNWM74PEBQAQ63SA3DUJLI3L4225U4ZVCLMSCBCIS",
      },
    },
    PYUSD: {
      code: "PYUSD",
      name: "PayPal USD",
      contract: "CCCRWH6Q3FNP3I2I57BDLM5AFAT7O6OF6GKQOC6SSJNDAVRZ57SPHGU2",
      decimals: 7,
      icon: "/assets/pyusd-logo.png",
      priceSource: "soroswap",
      isStablecoin: true,
      coinGeckoId: "paypal-usd",
    },
    KTB: {
      code: "KTB",
      name: "Korean Treasury Bond",
      contract: "CBAECV6UVDS6ZKPMC63MUYY4V7Q3KTHR7NLUFGVVGK7K3AQT475QTETP",
      decimals: 7,
      icon: "https://stellar.myfilebase.com/ipfs/Qma8QsiniBJHxydHtJZ4QX7X8Cx9kUkwKM9VbbAUEfTgWb",
      priceSource: "soroswap",
      isStablecoin: false,
    },
    GYEN: {
      code: "GYEN",
      name: "GMO JPY",
      contract: "CA67EQNWGPGXHVT6E4HQ65WEV54KFDB6HJDHVCJM33VKZ7XKR5MN3KPJ",
      decimals: 6,
      icon: "https://stellar.myfilebase.com/ipfs/Qmeysg43Da4zS5r1waeDi24ZZcq54AGqGjdiubPRtG9Vcq",
      priceSource: "soroswap",
      isStablecoin: true,
      coinGeckoId: "gyen",
    },
  },
};

import { stellarNetwork } from "@/lib/constants/network";

function getNetworkId(): NetworkId {
  const network = stellarNetwork?.toLowerCase() || "testnet";
  if (network === "local" || network === "standalone") return "standalone";
  if (network === "public" || network === "mainnet") return "mainnet";
  return "testnet";
}

export function getAssetsConfig(): Record<string, AssetConfig> {
  const networkId = getNetworkId();
  return ASSETS_BY_NETWORK[networkId] ?? ASSETS_BY_NETWORK.testnet;
}

/** CoinGecko `ids` value for `/simple/price`, if configured for this network. */
export function getCoinGeckoIdForToken(code: string): string | undefined {
  const assets = getAssetsConfig();
  return assets[code]?.coinGeckoId;
}

/** Reflector SEP-40 asset descriptor, if tracked by the oracle for this asset. */
export function getReflectorAssetForToken(
  code: string
): ReflectorAsset | undefined {
  return getAssetsConfig()[code]?.reflectorAsset;
}

export function getRwaTokenCodes(): string[] {
  const assets = getAssetsConfig();
  return Object.values(assets).map((a) => a.code);
}

export function getStablecoinCodes(): string[] {
  const assets = getAssetsConfig();
  return Object.values(assets)
    .filter((a) => a.isStablecoin)
    .map((a) => a.code);
}

export function getTokenIconMap(): Record<string, string> {
  const assets = getAssetsConfig();
  const map: Record<string, string> = {};
  for (const a of Object.values(assets)) {
    map[a.code] = a.icon;
  }
  return map;
}

export function getCurrentNetworkId(): NetworkId {
  return getNetworkId();
}

export function getContractToCodeMap(): Record<string, string> {
  const assets = getAssetsConfig();
  const map: Record<string, string> = {};
  for (const a of Object.values(assets)) {
    map[a.contract] = a.code;
  }
  return map;
}
