export type VaultHarvestConfig =
  | {
      type: "blend";
      label: string;
      strategyAddress: string;
    }
  | {
      type: "aquarius";
      label: string;
      strategyAddress: string;
    };

export interface VaultRebalanceStrategyConfig {
  name: string;
  address: string;
  targetBps: number;
}

export interface VaultRebalanceConfig {
  vaultId: string;
  label: string;
  strategies: readonly VaultRebalanceStrategyConfig[];
  harvest?: readonly VaultHarvestConfig[];
}

// The only vault contracts currently managed by the keeper.
const EURC_NEKO_VAULT =
  "CB3FUMFGCF6DHSFK6N2TOKHRMYXS34HFKQR45UKVORCRUM35AF3ES7WQ";
const USDC_NEKO_VAULT =
  "CCPKQH3K5XUGP5GXCT6WTABS7TGXRR745BJ4MEFSGNATB7AOBRL4VEOT";
const CETES_NEKO_VAULT =
  "CANBU7T77SCJOOAU6VQAOGR7DN36JBQFUN56XS2WA2VPJYUSRUBIPYDS";
const USTRY_NEKO_VAULT =
  "CCIRVAW3IZVAYLHR7YYMZFOQVYEW67OKFFXR3J6ZR2T6YJC5V7GTSNQ5";
const TESOURO_NEKO_VAULT =
  "CBMERS7MJHO6TGKUVWWU34ZSKWCFOWPG2ZCIRIT75IC3YDWBIPBMV5LB";
const CETES_BLEND_VAULT =
  "CDI2ZW5CKT4OIHX3IGMVJ4VGOH6Z64N2M3URKATYJIX7JRITJFQJPFD7";
const USTRY_BLEND_VAULT =
  "CBYTDU4JKTMFG5CNIUYJTOVMNIN5ADU2PDG4QWIUVT6SSVK3VTXYTF4K";
const USDC_BLEND_VAULT =
  "CCM3CKJI7BBMZ357644KLAE6NH4D7JQ6MUJHSV4UBRWJY7IMGHBJRNGR";
const TESOURO_BLEND_VAULT =
  "CAXRLUOSI7DL3SYNZW5UGRIPVNRKKSZTW35OX5DWKZSJ4PFEVA2VEFCQ";

// Strategy contracts used inside those vaults. These are not vault ids.
const EURC_NEKO_STRATEGY_CONTRACT =
  "CC5CE6MWISDXT3MLNQ7R3FVILFVFEIH3COWGH45GJKL6BD2ZHF7F7JVI";
const USDC_FIXED_NEKO_STRATEGY_CONTRACT =
  "CDB2WMKQQNVZMEBY7Q7GZ5C7E7IAFSNMZ7GGVD6WKTCEWK7XOIAVZSAP";
const USDC_ETHERFUSE_NEKO_STRATEGY_CONTRACT =
  "CCBTSHPUVNKCT5V675AAVYNANHXBU26PTZK2QLS7ZLFNYRJZT5HW3VL6";
const CETES_BLEND_STRATEGY_CONTRACT =
  "CAZ3LLLKPWEOVK6K4G5NCQ2VXWABLFIPKKNMN5GLKMZKEN7JSKTEMIKN";
const USTRY_BLEND_STRATEGY_CONTRACT =
  "CA3SO5RRKOONAPWVR5XY6CMOYZGN4M4QKVIGX5DFRIIJUJW2SFSELBXL";
const TESOURO_BLEND_STRATEGY_CONTRACT =
  "CDSCVJHJWUZQMR64FVK3XMND5NKSN7Z23KPRCHKFHVGOEJBWPVH5B5XA";

export const VAULT_REBALANCE_CONFIGS: readonly VaultRebalanceConfig[] = [
  {
    vaultId: EURC_NEKO_VAULT,
    label: "EURC Neko",
    strategies: [
      {
        name: "EURC Neko",
        address: EURC_NEKO_STRATEGY_CONTRACT,
        targetBps: 10_000,
      },
    ],
  },
  {
    vaultId: USDC_NEKO_VAULT,
    label: "USDC Neko",
    strategies: [
      {
        name: "USDC Fixed Neko",
        address: USDC_FIXED_NEKO_STRATEGY_CONTRACT,
        targetBps: 5_000,
      },
      {
        name: "USDC Etherfuse Neko",
        address: USDC_ETHERFUSE_NEKO_STRATEGY_CONTRACT,
        targetBps: 5_000,
      },
    ],
  },
  {
    vaultId: CETES_BLEND_VAULT,
    label: "CETES Blend Neko",
    strategies: [
      {
        name: "Blend CETES Neko",
        address: CETES_BLEND_STRATEGY_CONTRACT,
        targetBps: 10_000,
      },
    ],
  },
  {
    vaultId: USTRY_BLEND_VAULT,
    label: "USTRY Blend Neko",
    strategies: [
      {
        name: "Blend USTRY Neko",
        address: USTRY_BLEND_STRATEGY_CONTRACT,
        targetBps: 10_000,
      },
    ],
  },
  {
    vaultId: USDC_BLEND_VAULT,
    label: "USDC Blend Neko",
    strategies: [
      {
        name: "Blend USDC Neko",
        address: USDC_ETHERFUSE_NEKO_STRATEGY_CONTRACT,
        targetBps: 10_000,
      },
    ],
  },
  {
    vaultId: TESOURO_BLEND_VAULT,
    label: "TESOURO Blend Neko",
    strategies: [
      {
        name: "Blend TESOURO Neko",
        address: TESOURO_BLEND_STRATEGY_CONTRACT,
        targetBps: 10_000,
      },
    ],
  },
  {
    vaultId: CETES_NEKO_VAULT,
    label: "CETES Neko",
    strategies: [
      {
        name: "CETES Blend Autocompound Etherfuse",
        address: CETES_BLEND_STRATEGY_CONTRACT,
        targetBps: 10_000,
      },
    ],
  },
  {
    vaultId: USTRY_NEKO_VAULT,
    label: "USTRY Neko",
    strategies: [
      {
        name: "USTRY Blend Autocompound Etherfuse",
        address: USTRY_BLEND_STRATEGY_CONTRACT,
        targetBps: 10_000,
      },
    ],
  },
  {
    vaultId: TESOURO_NEKO_VAULT,
    label: "TESOURO Neko",
    strategies: [
      {
        name: "TESOURO Blend Autocompound Etherfuse",
        address: TESOURO_BLEND_STRATEGY_CONTRACT,
        targetBps: 10_000,
      },
    ],
  },
] as const;

function assertValidRebalanceConfig(configs: readonly VaultRebalanceConfig[]) {
  const seen = new Set<string>();

  for (const config of configs) {
    if (seen.has(config.vaultId)) {
      throw new Error(`Duplicate rebalance vault config: ${config.vaultId}`);
    }
    seen.add(config.vaultId);

    const targetSum = config.strategies.reduce(
      (sum, strategy) => sum + strategy.targetBps,
      0
    );
    if (targetSum !== 10_000) {
      throw new Error(
        `Rebalance targets for ${config.vaultId} sum to ${targetSum}, expected 10000`
      );
    }
  }
}

assertValidRebalanceConfig(VAULT_REBALANCE_CONFIGS);

const CONFIG_BY_VAULT_ID = new Map(
  VAULT_REBALANCE_CONFIGS.map((config) => [config.vaultId, config])
);

export function getVaultRebalanceConfig(
  vaultId: string
): VaultRebalanceConfig | undefined {
  return CONFIG_BY_VAULT_ID.get(vaultId);
}

export function getConfiguredRebalanceVaultIds(): string[] {
  return VAULT_REBALANCE_CONFIGS.map((config) => config.vaultId);
}
