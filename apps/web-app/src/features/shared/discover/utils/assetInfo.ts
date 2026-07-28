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
      "GYEN is the first regulated Japanese yen stablecoin, issued by GMO-Z.com Trust Company, a New York State-chartered limited purpose trust company. Each GYEN is backed 1:1 by JPY held in trust, with regular audits. Provides on-chain exposure to JPY for payments, remittances, and DeFi without counterparty risk from unregulated issuers.",
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
      "USTRY is an Etherfuse Stablebond backed 1:1 by short-to-medium-term US Treasury notes issued by the US Department of the Treasury. The token uses a rebase mechanism, your balance automatically increases as interest accrues daily, so you never need to manually claim yield.",
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
      "TESOURO is an Etherfuse Stablebond backed by Brazilian Letras do Tesouro Nacional (LTN), zero-coupon government bonds issued by Brazil's National Treasury. Yield accrues until maturity and is reflected in the token price. Offers on-chain exposure to Brazilian sovereign debt with transparent, 24/7 access.",
    highlights: [
      "Backed by Letras do Tesouro Nacional (LTN), the Brazilian government's zero-coupon bonds",
      "Denominated in BRL, provides on-chain exposure to Brazilian real interest rates",
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
      "CETES tokens represent Mexican Federal Treasury Certificates (Certificados de la Tesorería) on blockchain, short-term government debt instruments issued by the Mexican federal government and denominated in MXN. Etherfuse's CNBV-cleared Stablebond provides transparent, yield-bearing exposure to CETES with 24/7 trading.",
    highlights: [
      "Backed by Certificados de la Tesorería de la Federación (CETES) issued by the Mexican Treasury",
      "Cleared by Mexico's banking regulator (CNBV) for retail distribution",
      "Tracks short-term MXN interest rates, typical maturities of 28 to 364 days",
      "Daily price accrual reflects yield up to maturity, with no manual claim",
    ],
    buyInfo: {
      platform: "Etherfuse",
      url: "https://app.etherfuse.com/bonds/CETES",
      description:
        "CETES on Stellar: buy at app.etherfuse.com or test at devnet.etherfuse.com.",
    },
  },
  // XAUM: {
  //   logo: "https://stellar.myfilebase.com/ipfs/QmbMy88CNd95QEL6rjVHFtWrT8ao2zaypfb19TBYgmBCv8",
  //   name: "Matrixdock Gold",
  //   description:
  //     "Tokenized physical gold: each token is backed by one troy ounce of LBMA-accredited gold",
  //   summary:
  //     "XAUm is Matrixdock's tokenized gold product, expanded to Stellar in June 2026. Each token represents one troy ounce of 99.99% purity LBMA-accredited physical gold stored with Brink's and Malca-Amit, with reserves independently audited by Bureau Veritas. XAUm ranks among the largest tokenized gold products globally, offering on-chain gold exposure with 24/7 transferability.",
  //   highlights: [
  //     "Backed 1:1 by one troy ounce of 99.99% purity LBMA-accredited physical gold per token",
  //     "Gold stored with Brink's and Malca-Amit; reserves audited by Bureau Veritas",
  //     "Stellar contracts audited by OtterSec and Runtime Verification",
  //     "Among the top tokenized gold products globally by size",
  //   ],
  //   buyInfo: {
  //     platform: "Matrixdock",
  //     url: "https://www.matrixdock.com",
  //     description:
  //       "XAUm on Stellar: mint and redeem directly through Matrixdock, or trade against USDC in the Aquarius AMM pool.",
  //   },
  // },
  BENJI: {
    logo: "/assets/franklin-templeton-logo.png",
    name: "Franklin OnChain U.S. Government Money Fund",
    description:
      "Share of Franklin Templeton's tokenized US government money market fund",
    summary:
      "Each BENJI token is one share of FOBXX, Franklin Templeton's OnChain U.S. Government Money Fund, and was the first US-registered mutual fund to use a public blockchain as its official record of ownership. Stellar was its original issuance chain. The share price is held at $1.00 and yield is distributed as additional tokens. Transfers are restricted to investors Franklin Templeton has onboarded, so BENJI is shown here for reference and cannot be swapped in-app.",
    highlights: [
      "One token equals one share of FOBXX, a '40 Act US government money market fund",
      "First US-registered mutual fund to keep its share register on a public blockchain",
      "Holds US government securities, cash, and fully collateralised repurchase agreements",
      "Transfers are allowlist-gated: acquire and redeem through the Benji app, not on-chain",
    ],
    buyInfo: {
      platform: "Franklin Templeton",
      url: "https://www.franklintempleton.com/benji",
      description:
        "BENJI is only transferable between Franklin Templeton–approved accounts. Onboard through the Benji app to buy or redeem.",
    },
  },
  JTRSY: {
    logo: "https://centrifuge.mypinata.cloud/ipfs/bafkreieracb5e57bhg7bphd7sp4hxf3yhbm3cxinst3o5mennfosagkxuu",
    name: "Janus Henderson Anemoy Treasury Fund",
    description:
      "Tokenized short-term US Treasury bill fund, restricted to allowlisted holders",
    summary:
      "JTRSY is the institutional share class of the Janus Henderson Anemoy Treasury Fund, holding short-dated US Treasury bills. Yield accrues into the token price rather than being paid out, so the price rises over time instead of sitting at $1.00. Transfers are limited to addresses on Centrifuge's allowlist and can be paused by authorized operators, so it is reference-only here. deJTRSY is the freely transferable version of the same underlying fund.",
    highlights: [
      "Backed by short-duration US Treasury bills managed by Janus Henderson / Anemoy",
      "Accumulating: yield is reflected in a rising token price, not in extra tokens",
      "Transfers restricted to allowlisted addresses and pausable by operators",
      "Wrapped as deJTRSY for holders who need a freely transferable version",
    ],
    buyInfo: {
      platform: "Centrifuge",
      url: "https://app.centrifuge.io/pool/281474976710662",
      description:
        "View fund details, eligibility, performance, and investment access in the Centrifuge app.",
    },
  },
  DEJTRSY: {
    logo: "https://centrifuge.mypinata.cloud/ipfs/bafkreieracb5e57bhg7bphd7sp4hxf3yhbm3cxinst3o5mennfosagkxuu",
    name: "DeFi Janus Henderson Anemoy Treasury Fund",
    description:
      "Freely transferable wrapper around the tokenized US Treasury bill fund",
    summary:
      "deJTRSY is Centrifuge's deRWA wrapper around JTRSY, the Janus Henderson Anemoy Treasury Fund. It carries the same exposure to short-dated US Treasury bills but drops the allowlist, so it can be held, traded, and used as collateral by anyone on Stellar. This is the version available through Stellar AMM liquidity.",
    highlights: [
      "Same underlying short-duration US Treasury bill portfolio as JTRSY",
      "Freely transferable: no allowlist, tradable and usable as DeFi collateral",
      "Accumulating: yield is reflected in a rising token price",
      "Issued by the Open Market Foundation and pausable by authorized operators",
    ],
    buyInfo: {
      platform: "Centrifuge",
      url: "https://app.centrifuge.io/pool/281474976710660",
      description:
        "View deJTRSY performance, integrations, and access options in the Centrifuge app.",
    },
  },
  JAAA: {
    logo: "https://centrifuge.mypinata.cloud/ipfs/bafkreifp5ww5lpbgrny36oxgzg2kjw2226lmj2vmekp4nqemm5ewhhtmwi",
    name: "Janus Henderson Anemoy AAA CLO Fund",
    description:
      "Tokenized AAA-rated collateralized loan obligations, restricted to allowlisted holders",
    summary:
      "JAAA is the institutional share class of the Janus Henderson Anemoy AAA CLO Fund, holding the AAA-rated tranches of collateralized loan obligations, pools of senior secured corporate loans. The AAA tranche is paid first and absorbs losses last. Transfers are limited to Centrifuge's allowlist, so it is reference-only here; deJAAA is the freely transferable version.",
    highlights: [
      "Holds AAA-rated CLO tranches, the most senior claim on pooled corporate loans",
      "Managed by Janus Henderson, a long-standing manager in the CLO market",
      "Yields more than Treasuries in exchange for corporate credit and liquidity risk",
      "Transfers restricted to allowlisted addresses; wrapped as deJAAA for open access",
    ],
    buyInfo: {
      platform: "Centrifuge",
      url: "https://app.centrifuge.io/pool/281474976710663",
      description:
        "View fund details, eligibility, performance, and investment access in the Centrifuge app.",
    },
  },
  DEJAAA: {
    logo: "https://centrifuge.mypinata.cloud/ipfs/bafkreifp5ww5lpbgrny36oxgzg2kjw2226lmj2vmekp4nqemm5ewhhtmwi",
    name: "DeFi Janus Henderson Anemoy AAA CLO Fund",
    description:
      "Freely transferable wrapper around the tokenized AAA-rated CLO fund",
    summary:
      "deJAAA is Centrifuge's deRWA wrapper around JAAA, the Janus Henderson Anemoy AAA CLO Fund. It gives the same exposure to AAA-rated collateralized loan obligation tranches without the allowlist, so it can be traded and used as collateral across Stellar DeFi. Note that the AAA rating describes the credit risk of the underlying loans, it is not a peg, and the token price moves.",
    highlights: [
      "Same AAA-rated CLO tranche exposure as JAAA, without transfer restrictions",
      "Freely transferable: tradable on Stellar DEXs and usable as DeFi collateral",
      "AAA refers to credit quality of the loan pool, not to price stability",
      "Issued by the Open Market Foundation and pausable by authorized operators",
    ],
    buyInfo: {
      platform: "Centrifuge",
      url: "https://app.centrifuge.io/pool/281474976710659",
      description:
        "View deJAAA performance, integrations, and access options in the Centrifuge app.",
    },
  },
};

export const ASSET_INFO: Record<string, AssetInfo> = Object.fromEntries(
  Object.entries(RAW).map(([code, info]) => [
    code,
    { ...info, taxonomy: info.taxonomy ?? ASSET_TAXONOMY[code] },
  ])
);
