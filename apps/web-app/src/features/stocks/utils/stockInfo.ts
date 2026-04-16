import type { StockInfo } from "../types/stocks";

export const STOCK_INFO: Record<string, StockInfo> = {
  XLM: {
    logo: "/assets/xlm-logo.png",
    name: "Stellar Lumens",
    description:
      "Native token of the Stellar network, used for fees and reserves",
    summary:
      "XLM is the native currency of Stellar — a decentralized payment network built for fast, low-cost cross-border transfers. Every Stellar account must hold a minimum reserve in XLM, and each transaction costs a small fee (~0.00001 XLM). XLM also acts as a bridge currency between assets that lack a direct trading pair on the Stellar DEX. Buy on major exchanges: Coinbase, Binance, Kraken, Bybit, and others. This is NOT a Real-World Asset",
  },
  USDC: {
    logo: "/assets/usdc-logo.png",
    name: "USD Coin",
    description: "Dollar-backed stablecoin issued by Circle, pegged 1:1 to USD",
    summary:
      "USDC is a fully-reserved US dollar stablecoin issued by Circle. Each USDC is backed 1:1 by cash and short-term US Treasuries held in segregated accounts, audited monthly. On Stellar, Circle issues USDC natively — enabling near-instant, near-free dollar settlement for payments, remittances, and DeFi. USDC on Stellar is widely supported by wallets, exchanges, and anchors.",
  },
  EURC: {
    logo: "https://ipfs.io/ipfs/bafkreidizqlammdzrrurfq3o5owta77fiyonn6ri72h6rltqimn2xs2by4",
    name: "Euro Coin",
    description: "Euro-backed stablecoin issued by Circle, pegged 1:1 to EUR",
    summary:
      "EURC is Circle's MiCA-compliant euro stablecoin, fully backed 1:1 by euro-denominated reserves held in regulated financial institutions. It is redeemable at par and subject to monthly attestations. Available on Stellar, Ethereum, Avalanche, Base, and Solana. On Stellar, EURC enables low-cost euro payments and settlements across the global Stellar network.",
  },
  USDY: {
    logo: "/assets/usdy-logo.png",
    name: "US Dollar Yieldcoin",
    description:
      "Yield-bearing stablecoin backed by US Treasury bills and bank deposits",
    summary:
      "USDY is Ondo Finance's tokenized yield-bearing instrument backed by short-term US Treasuries and bank demand deposits. Unlike traditional stablecoins, USDY accrues yield daily and is designed for non-US persons. The token uses a rebase mechanism so balances automatically reflect accrued interest. Available on Stellar, Ethereum, Solana, and more. Not available to US persons.",
    buyInfo: {
      platform: "Lobstr",
      url: "https://lobstr.co",
      description:
        "USDY on Stellar: Lobstr (swap/DEX), Soroswap, or Ondo Finance anchors. Also on Bybit and Phemex. Not available to US persons.",
    },
  },
  PYUSD: {
    logo: "/assets/pyusd-logo.png",
    name: "PayPal USD",
    description:
      "US dollar stablecoin issued by PayPal and Paxos, pegged 1:1 to USD",
    summary:
      "PYUSD is PayPal's dollar-backed stablecoin issued by Paxos Trust Company. Each token is backed 1:1 by USD deposits and US Treasury bills, with monthly attestations published by Grant Thornton. Originally launched on Ethereum, PYUSD expanded to Stellar for faster and cheaper settlement. Accessible through PayPal, Venmo, and a growing list of Stellar wallets and anchors.",
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
      "GYEN is the first regulated Japanese yen stablecoin, issued by GMO-Z.com Trust Company — a New York State-chartered limited purpose trust company. Each GYEN is backed 1:1 by JPY held in trust, with regular audits. Available on Stellar, Ethereum, and Solana. Provides on-chain exposure to JPY for payments, remittances, and DeFi without counterparty risk from unregulated issuers.",
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
      "USTRY is an Etherfuse Stablebond backed 1:1 by short-to-medium-term US Treasury notes issued by the US Department of the Treasury. The token uses a rebase mechanism — your balance automatically increases as interest accrues daily, so you never need to manually claim yield. Available on Stellar, Solana, and Base. Purchase through Etherfuse at app.etherfuse.com.",
    buyInfo: {
      platform: "Etherfuse",
      url: "https://app.etherfuse.com/bonds/USTRY",
      description:
        "USTRY on Stellar: buy directly at app.etherfuse.com or test on devnet.etherfuse.com. Also available on Solana and Base.",
    },
  },
  TESOURO: {
    logo: "https://stablebonds.s3.us-west-2.amazonaws.com/stablebond/spl-tesouro.png",
    name: "Brazil Government Bonds",
    description:
      "Tokenized Brazilian government bonds (Letras do Tesouro Nacional)",
    summary:
      "TESOURO is an Etherfuse Stablebond backed by Brazilian Letras do Tesouro Nacional (LTN) — BB-rated zero-coupon government bonds issued by Brazil's National Treasury. Yield accrues until maturity and is reflected in the token price. Offers on-chain exposure to Brazilian sovereign debt with transparent, 24/7 access. Available on Stellar, Solana, and Base.",
    buyInfo: {
      platform: "Etherfuse",
      url: "https://app.etherfuse.com/bonds/TESOURO",
      description:
        "TESOURO on Stellar: buy at app.etherfuse.com or test at devnet.etherfuse.com. Also available on Solana and Base.",
    },
  },
  CETES: {
    logo: "https://stablebonds.s3.us-west-2.amazonaws.com/stablebond/spl-cetes.png",
    name: "Mexican Treasury Token",
    description: "Tokenized Mexican government treasury certificates (CETES)",
    summary:
      "CETES tokens represent Mexican Federal Treasury Certificates (Certificados de la Tesorería) on blockchain — short-term government debt instruments issued by the Mexican federal government and denominated in MXN. Etherfuse's CNBV-cleared Stablebond provides transparent, yield-bearing exposure to CETES with 24/7 trading. Available on Stellar, Solana, and Base.",
    buyInfo: {
      platform: "Etherfuse",
      url: "https://app.etherfuse.com/bonds/CETES",
      description:
        "CETES on Stellar: buy at app.etherfuse.com or test at devnet.etherfuse.com. Also available on Solana and Base.",
    },
  },
  KTB: {
    logo: "https://stellar.myfilebase.com/ipfs/Qma8QsiniBJHxydHtJZ4QX7X8Cx9kUkwKM9VbbAUEfTgWb",
    name: "Korean Treasury Bond",
    description:
      "Tokenized Korean government bonds issued via Etherfuse and Shinhan Securities",
    summary:
      "KTB is an Etherfuse Stablebond backed by short-term Korean Treasury Bonds — sovereign debt instruments issued by the South Korean government and denominated in KRW. Launched in partnership with Shinhan Securities, KTB brings exposure to one of Asia's largest and most stable government bond markets on-chain. Available on Stellar, Solana, Base, Polygon, and Monad.",
    buyInfo: {
      platform: "Etherfuse",
      url: "https://app.etherfuse.com/bonds/KTB",
      description:
        "KTB on Stellar: buy at app.etherfuse.com or test at devnet.etherfuse.com. Also available on Solana, Base, Polygon, and Monad.",
    },
  },
};
