export interface ReflectorAsset {
  tag: "Stellar" | "Other";
  value: string;
}

export type AssetPriceSource = "reflector" | "swap-kit" | "coingecko";

export interface AssetConfig {
  code: string;
  name: string;
  contract: string;
  decimals: number;
  icon: string;
  priceSource: AssetPriceSource;
  isStablecoin?: boolean;
  /** Whether the asset is currently supported by the platform swap router. */
  isSwappable?: boolean;
  /**
   * Transfers are restricted to allowlisted/authorized holders — the issuer
   * gates who may hold the asset (SEP-8 style `auth_required` trustlines, or a
   * contract-level allowlist). A retail wallet cannot acquire these by simply
   * adding a trustline or swapping, so surface them as reference-only rather
   * than as something a user can buy.
   */
  isInstitutional?: boolean;
  /**
   * CoinGecko `/simple/price` id (e.g. `stellar`, `usd-coin`).
   * Used as an off-chain fallback when primary pricing is unavailable.
   */
  coinGeckoId?: string;
  /**
   * SEP-40 asset identifier as tracked by the Reflector oracle.
   * If set, StellarPriceService queries Reflector first (mainnet only).
   * `Stellar` = SAC contract address; `Other` = symbol (e.g. "BTC").
   */
  reflectorAsset?: ReflectorAsset;
}

export type NetworkId = "testnet" | "standalone" | "mainnet";

const ASSETS_BY_NETWORK: Record<NetworkId, Record<string, AssetConfig>> = {
  testnet: {},
  standalone: {
    XLM: {
      code: "XLM",
      name: "Stellar Lumens",
      contract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
      decimals: 7,
      icon: "/assets/xlm-logo.png",
      priceSource: "swap-kit",
      coinGeckoId: "stellar",
    },
    USDC: {
      code: "USDC",
      name: "USD Coin",
      contract: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
      decimals: 7,
      icon: "/assets/usdc-logo.png",
      priceSource: "swap-kit",
      isStablecoin: true,
      coinGeckoId: "usd-coin",
    },
  },
  mainnet: {
    BENJI: {
      code: "BENJI",
      name: "Franklin OnChain U.S. Government Money Fund",
      // SAC for BENJI-GBHNGLLIE3KWGKCHIKMHJ5HVZHYIK7WTBE4QF5PLAKL4CJGSEU7HZIW5
      // (issuer home_domain www.franklintempleton.com). Beware: several
      // impostor BENJI assets exist on mainnet under lookalike domains.
      contract: "CCDSDPD7FXB74PFB2SYCHGQRWLXQRYRTQSPCVSRJ7FAOLOUGWEYAXQ7A",
      decimals: 7,
      icon: "/assets/franklin-templeton-logo.png",
      priceSource: "coingecko",
      isStablecoin: false,
      isInstitutional: true,
      coinGeckoId: "franklin-templeton-benji",
    },
    JTRSY: {
      code: "JTRSY",
      name: "Janus Henderson Anemoy Treasury Fund",
      contract: "CBHOEKLWTB6HR2A3IXHIIMQG5FOXWXS6EG4Q5YJDRPMXPCX7M24CYR2O",
      decimals: 18,
      icon: "https://centrifuge.mypinata.cloud/ipfs/bafkreieracb5e57bhg7bphd7sp4hxf3yhbm3cxinst3o5mennfosagkxuu",
      priceSource: "coingecko",
      isStablecoin: false,
      isInstitutional: true,
      coinGeckoId: "janus-henderson-anemoy-treasury-fund",
    },
    JAAA: {
      code: "JAAA",
      name: "Janus Henderson Anemoy AAA CLO Fund",
      contract: "CDV6U7OEVY6KUEJ4WNS63AYB6RFU3BAE7AZJOQ7LPH447C6NWUXEZZSO",
      decimals: 18,
      icon: "https://centrifuge.mypinata.cloud/ipfs/bafkreifp5ww5lpbgrny36oxgzg2kjw2226lmj2vmekp4nqemm5ewhhtmwi",
      priceSource: "coingecko",
      isStablecoin: false,
      isInstitutional: true,
      coinGeckoId: "janus-henderson-anemoy-aaa-clo-fund",
    },
    // Keyed uppercase (canonical spelling is `deJTRSY`): the discover layer
    // looks assets up by `code.toUpperCase()`, so a mixed-case key renders a
    // card with no config and a dead detail route.
    DEJTRSY: {
      code: "DEJTRSY",
      name: "DeFi Janus Henderson Anemoy Treasury Fund",
      contract: "CBI7UCH5KGSVQRO5H4SUCZUTZABCITZLRHQQZTWL2TK4RZ72TAR6IHRV",
      decimals: 18,
      icon: "https://centrifuge.mypinata.cloud/ipfs/bafkreieracb5e57bhg7bphd7sp4hxf3yhbm3cxinst3o5mennfosagkxuu",
      priceSource: "swap-kit",
      isStablecoin: false,
    },
    // Keyed uppercase; canonical spelling is `deJAAA`. See DEJTRSY above.
    DEJAAA: {
      code: "DEJAAA",
      name: "DeFi Janus Henderson Anemoy AAA CLO Fund",
      contract: "CC64WBDGS6QQP22QTTIACYIXT3WF7BBQEYOQPLTP7GTKYY7PZ74QYGSL",
      decimals: 18,
      icon: "https://centrifuge.mypinata.cloud/ipfs/bafkreifp5ww5lpbgrny36oxgzg2kjw2226lmj2vmekp4nqemm5ewhhtmwi",
      priceSource: "swap-kit",
      isStablecoin: false,
      coinGeckoId: "defi-janus-henderson-anemoy-aaa-clo-fund",
    },
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
      priceSource: "swap-kit",
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
      icon: "/assets/eurc-logo.png",
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
      priceSource: "swap-kit",
      isStablecoin: true,
      coinGeckoId: "paypal-usd",
    },
    GYEN: {
      code: "GYEN",
      name: "GMO JPY",
      contract: "CA67EQNWGPGXHVT6E4HQ65WEV54KFDB6HJDHVCJM33VKZ7XKR5MN3KPJ",
      decimals: 6,
      icon: "https://stellar.myfilebase.com/ipfs/Qmeysg43Da4zS5r1waeDi24ZZcq54AGqGjdiubPRtG9Vcq",
      priceSource: "swap-kit",
      isStablecoin: true,
      isSwappable: false,
      coinGeckoId: "gyen",
    },
  },
};

/**
 * Normalize a stellar network identifier (`PUBLIC`, `TESTNET`, `LOCAL`,
 * `mainnet`, `testnet`, `standalone`, etc.) to the internal `NetworkId`
 * used by the assets registry.
 */
export function getCurrentNetworkId(stellarNetwork?: string | null): NetworkId {
  const network = stellarNetwork?.toLowerCase() || "testnet";
  if (network === "local" || network === "standalone") return "standalone";
  if (network === "public" || network === "mainnet") return "mainnet";
  return "testnet";
}

export function getAssetsConfig(
  networkId: NetworkId
): Record<string, AssetConfig> {
  return ASSETS_BY_NETWORK[networkId] ?? ASSETS_BY_NETWORK.testnet;
}

/** CoinGecko `ids` value for `/simple/price`, if configured for this network. */
export function getCoinGeckoIdForToken(
  networkId: NetworkId,
  code: string
): string | undefined {
  const assets = getAssetsConfig(networkId);
  return assets[code]?.coinGeckoId;
}

/** Reflector SEP-40 asset descriptor, if tracked by the oracle for this asset. */
export function getReflectorAssetForToken(
  networkId: NetworkId,
  code: string
): ReflectorAsset | undefined {
  return getAssetsConfig(networkId)[code]?.reflectorAsset;
}

export function getRwaTokenCodes(networkId: NetworkId): string[] {
  const assets = getAssetsConfig(networkId);
  return Object.values(assets).map((a) => a.code);
}

export function getStablecoinCodes(networkId: NetworkId): string[] {
  const assets = getAssetsConfig(networkId);
  return Object.values(assets)
    .filter((a) => a.isStablecoin)
    .map((a) => a.code);
}

export function getTokenIconMap(networkId: NetworkId): Record<string, string> {
  const assets = getAssetsConfig(networkId);
  const map: Record<string, string> = {};
  for (const a of Object.values(assets)) {
    map[a.code] = a.icon;
  }
  return map;
}

export function getContractToCodeMap(
  networkId: NetworkId
): Record<string, string> {
  const assets = getAssetsConfig(networkId);
  const map: Record<string, string> = {};
  for (const a of Object.values(assets)) {
    map[a.contract] = a.code;
  }
  return map;
}
