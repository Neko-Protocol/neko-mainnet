import type { AssetInfo } from "../types/discover";
import { ASSET_TAXONOMY } from "./assetClass";

const RAW: Record<string, AssetInfo> = {
  XLM: {
    logo: "/assets/xlm-logo.png",
    name: "Stellar Lumens",
    description:
      "Native token of the Stellar network, used for fees and reserves",
    summary:
      "XLM is the native currency of Stellar, a decentralized payment network built for fast, low-cost cross-border transfers. Every Stellar account must hold a minimum reserve in XLM, and each transaction costs a small fee (~0.00001 XLM). XLM also acts as a bridge currency between assets that lack a direct trading pair on the Stellar DEX.",
    highlights: [
      "Pays fees and the minimum reserve required to keep a Stellar account open",
      "Used as a bridge currency for path payments between assets without a direct pair",
      "Capped supply with no inflation since the 2019 community vote",
      "3–5 second confirmation times and sub-cent transaction fees",
    ],
  },
  USDC: {
    logo: "/assets/usdc-logo.png",
    name: "USD Coin",
    description: "Dollar-backed stablecoin issued by Circle, pegged 1:1 to USD",
    summary:
      "USDC is a fully-reserved US dollar stablecoin issued by Circle. Each USDC is backed 1:1 by cash and short-term US Treasuries held in segregated accounts, audited monthly. On Stellar, Circle issues USDC natively, enabling near-instant, near-free dollar settlement for payments, remittances, and DeFi. USDC on Stellar is widely supported by wallets, exchanges, and anchors.",
    highlights: [
      "Backed 1:1 by cash and short-duration US Treasuries held with regulated custodians",
      "Monthly attestations published by Deloitte covering reserve composition",
      "Issued by Circle, a US-regulated money-services business",
      "Natively redeemable through Circle Mint for verified institutional accounts",
    ],
  },
  EURC: {
    logo: "/assets/eurc-logo.png",
    name: "Euro Coin",
    description: "Euro-backed stablecoin issued by Circle, pegged 1:1 to EUR",
    summary:
      "EURC is Circle's MiCA-compliant euro stablecoin, fully backed 1:1 by euro-denominated reserves held in regulated financial institutions. It is redeemable at par and subject to monthly attestations. On Stellar, EURC enables low-cost euro payments and settlements across the global Stellar network.",
    highlights: [
      "First major euro stablecoin authorised under the EU's MiCA framework",
      "Reserves held in segregated accounts with regulated European banks",
      "Monthly third-party attestations confirm 1:1 backing",
      "Designed for euro-area payments, FX flows, and on-chain settlement",
    ],
  },
  USDY: {
    logo: "/assets/usdy-logo.png",
    name: "US Dollar Yieldcoin",
    description:
      "Yield-bearing stablecoin backed by US Treasury bills and bank deposits",
    summary:
      "USDY is Ondo Finance's tokenized yield-bearing instrument backed by short-term US Treasuries and bank demand deposits. Unlike traditional stablecoins, USDY accrues yield daily and is designed for non-US persons. The token uses a rebase mechanism so balances automatically reflect accrued interest. Not available to US persons.",
    highlights: [
      "Backed by short-duration US Treasuries and bank demand deposits",
      "Yield accrues daily and is reflected in the token price",
      "Issued by Ondo USDY LLC, a bankruptcy-remote special-purpose vehicle",
      "Restricted from US persons under Regulation S",
    ],
  },
  PYUSD: {
    logo: "/assets/pyusd-logo.png",
    name: "PayPal USD",
    description:
      "US dollar stablecoin issued by PayPal and Paxos, pegged 1:1 to USD",
    summary:
      "PYUSD is PayPal's dollar-backed stablecoin issued by Paxos Trust Company. Each token is backed 1:1 by USD deposits and US Treasury bills, with monthly attestations published by an independent auditor. Originally launched on Ethereum, PYUSD expanded to Stellar for faster and cheaper settlement. Accessible through PayPal, Venmo, and a growing list of Stellar wallets and anchors.",
    highlights: [
      "Issued by Paxos Trust, a New York State–chartered limited-purpose trust",
      "Backed 1:1 by US dollar deposits and short-term Treasury bills",
      "Held and spent natively inside PayPal and Venmo by hundreds of millions of users",
      "Monthly reserve reports published by an independent auditor",
    ],
    buyInfo: {
      platform: "PayPal",
      url: "https://www.paypal.com/us/digital-wallet/manage-money/crypto/pyusd",
      description:
        "PYUSD on Stellar: Lobstr, Bitcoin.com Wallet, Chipper Cash, Decaf, Arculus, Meru, CiNKO, COCA. Also available directly via PayPal and Venmo.",
    },
  },
  GYEN: {
    logo: "https://stellar.myfilebase.com/ipfs/Qmeysg43Da4zS5r1waeDi24ZZcq54AGqGjdiubPRtG9Vcq",
    name: "GMO JPY",
    description:
      "Japanese yen stablecoin issued by GMO-Z.com Trust Company, pegged 1:1 to JPY",
    summary:
      "GYEN is the first regulated Japanese yen stablecoin, issued by GMO-Z.com Trust Company — a New York State-chartered limited purpose trust company. Each GYEN is backed 1:1 by JPY held in trust, with regular audits. Provides on-chain exposure to JPY for payments, remittances, and DeFi without counterparty risk from unregulated issuers.",
    highlights: [
      "First regulated JPY stablecoin, supervised by NYDFS",
      "Reserves held 1:1 in JPY at regulated Japanese banks",
      "Issued by GMO-Z.com Trust, part of the publicly-listed GMO Internet Group",
      "Useful for FX hedging, remittances, and JPY-denominated DeFi",
    ],
    buyInfo: {
      platform: "GMO Trust",
      url: "https://stablecoin.z.com",
      description:
        "GYEN on Stellar: available via Lobstr or directly through GMO-Z.com Trust for institutional and retail accounts.",
    },
  },
  USTRY: {
    logo: "https://stablebonds.s3.us-west-2.amazonaws.com/stablebond/spl-ustry.png",
    name: "US Treasury Token",
    description:
      "Tokenized US Treasury notes providing on-chain yield via Etherfuse",
    summary:
      "USTRY is an Etherfuse Stablebond backed 1:1 by short-to-medium-term US Treasury notes issued by the US Department of the Treasury. The token uses a rebase mechanism — your balance automatically increases as interest accrues daily, so you never need to manually claim yield. Purchase through Etherfuse at app.etherfuse.com.",
    highlights: [
      "Backed 1:1 by short-duration US Treasury notes held by a regulated custodian",
      "Yield from the underlying bonds passed through to holders daily",
      "Issued by Etherfuse, a registered tokenization platform for sovereign debt",
      "Redeemable at par in USD against the underlying reserve",
    ],
    buyInfo: {
      platform: "Etherfuse",
      url: "https://app.etherfuse.com/bonds/USTRY",
      description:
        "USTRY on Stellar: buy directly at app.etherfuse.com or test on devnet.etherfuse.com.",
    },
  },
  TESOURO: {
    logo: "https://stablebonds.s3.us-west-2.amazonaws.com/stablebond/spl-tesouro.png",
    name: "Brazil Government Bonds",
    description:
      "Tokenized Brazilian government bonds (Letras do Tesouro Nacional)",
    summary:
      "TESOURO is an Etherfuse Stablebond backed by Brazilian Letras do Tesouro Nacional (LTN) — zero-coupon government bonds issued by Brazil's National Treasury. Yield accrues until maturity and is reflected in the token price. Offers on-chain exposure to Brazilian sovereign debt with transparent, 24/7 access. Available on Stellar, Solana, and Base.",
    highlights: [
      "Backed by Letras do Tesouro Nacional (LTN), the Brazilian government's zero-coupon bonds",
      "Denominated in BRL — provides on-chain exposure to Brazilian real interest rates",
      "Bonds custodied with regulated Brazilian institutions",
      "Historically among the highest-yielding sovereign instruments in the major economies",
    ],
    buyInfo: {
      platform: "Etherfuse",
      url: "https://app.etherfuse.com/bonds/TESOURO",
      description:
        "TESOURO on Stellar: buy at app.etherfuse.com or test at devnet.etherfuse.com.",
    },
  },
  CETES: {
    logo: "https://stablebonds.s3.us-west-2.amazonaws.com/stablebond/spl-cetes.png",
    name: "Mexican Treasury Token",
    description: "Tokenized Mexican government treasury certificates (CETES)",
    summary:
      "CETES tokens represent Mexican Federal Treasury Certificates (Certificados de la Tesorería) on blockchain — short-term government debt instruments issued by the Mexican federal government and denominated in MXN. Etherfuse's CNBV-cleared Stablebond provides transparent, yield-bearing exposure to CETES with 24/7 trading.",
    highlights: [
      "Backed by Certificados de la Tesorería de la Federación (CETES) issued by the Mexican Treasury",
      "Cleared by Mexico's banking regulator (CNBV) for retail distribution",
      "Tracks short-term MXN interest rates — typical maturities of 28 to 364 days",
      "Daily price accrual reflects yield up to maturity, with no manual claim",
    ],
    buyInfo: {
      platform: "Etherfuse",
      url: "https://app.etherfuse.com/bonds/CETES",
      description:
        "CETES on Stellar: buy at app.etherfuse.com or test at devnet.etherfuse.com.",
    },
  },
  KTB: {
    logo: "https://stellar.myfilebase.com/ipfs/Qma8QsiniBJHxydHtJZ4QX7X8Cx9kUkwKM9VbbAUEfTgWb",
    name: "Korean Treasury Bond",
    description:
      "Tokenized Korean government bonds issued via Etherfuse and Shinhan Securities",
    summary:
      "KTB is an Etherfuse Stablebond backed by short-term Korean Treasury Bonds — sovereign debt instruments issued by the South Korean government and denominated in KRW. Launched in partnership with Shinhan Securities, KTB brings exposure to one of Asia's largest and most stable government bond markets on-chain.",
    highlights: [
      "Backed by Korean Treasury Bonds, sovereign debt of the Republic of Korea",
      "Distributed in partnership with Shinhan Securities, a top-tier Korean broker",
      "Provides on-chain exposure to KRW-denominated rates, historically AA-rated",
      "One of the few Asian sovereign instruments accessible on public blockchains",
    ],
    buyInfo: {
      platform: "Etherfuse",
      url: "https://app.etherfuse.com/bonds/KTB",
      description:
        "KTB on Stellar: buy at app.etherfuse.com or test at devnet.etherfuse.com.",
    },
  },
};

export const ASSET_INFO: Record<string, AssetInfo> = Object.fromEntries(
  Object.entries(RAW).map(([code, info]) => [
    code,
    { ...info, taxonomy: info.taxonomy ?? ASSET_TAXONOMY[code] },
  ])
);
