export const SITE_URL = "https://nekoprotocol.xyz" as const;

/** Public vaults URL used in deposit-success tweets (Twitter Card target). */
export const DAPP_VAULTS_PUBLIC_URL =
  "https://dapp.nekoprotocol.xyz/vaults" as const;

export type VaultDepositShareIntentParams = {
  vaultName: string;
  /** e.g. `5.00%` — shown as `Vault · 5.00% APY` (never includes deposit $). */
  apy: string;
};

export function formatVaultShareStatsLine(
  vaultName: string,
  apy: string
): string {
  const trimmed = apy.trim();
  const apyPart = trimmed.endsWith("%") ? `${trimmed} APY` : `${trimmed}% APY`;
  return `${vaultName} · ${apyPart}`;
}

export function buildVaultDepositSuccessTweetBody(
  params: VaultDepositShareIntentParams
): string {
  const stats = formatVaultShareStatsLine(params.vaultName, params.apy);

  return [
    "Just made my first deposit into a @NekoProto vault! 🔥",
    "",
    stats,
    "",
    "Now earning real yield from RWAs, powered by @BuildOnStellar.",
    "",
    "Time to put your RWAs to work 👇🏼",
    DAPP_VAULTS_PUBLIC_URL,
  ].join("\n");
}

export function generateVaultDepositShareIntentUrl(
  params: VaultDepositShareIntentParams
): string {
  const text = buildVaultDepositSuccessTweetBody(params);
  return `https://twitter.com/intent/tweet?${new URLSearchParams({ text }).toString()}`;
}

export type ShareTweetParams = {
  amount: string;
  vaultName: string;
  apy: string;
  shareId: string;
};

export function buildSharePageUrl(shareId: string): string {
  const encodedId = encodeURIComponent(shareId);
  return `${SITE_URL}/share/${encodedId}`;
}

/** Tweet body lines (no URL). Used by Web Share and intent `text` param. */
export function buildTweetText(params: ShareTweetParams): string {
  const statsLine = `${params.vaultName} · ${params.amount} · ${params.apy} APY`;

  return [
    "Just made my first deposit into a @NekoProto vault! 🔥",
    "",
    statsLine,
    "",
    "Now earning real yield from RWAs, powered by @BuildOnStellar.",
    "",
    "Time to put your RWAs to work 👇🏼",
  ].join("\n");
}

/**
 * Builds an X/Twitter intent URL with encoded tweet body and canonical share URL.
 * Crawlers read OG/Twitter tags from the share page; the composer does not attach images via intent.
 */
export function generateShareTweet(params: ShareTweetParams): string {
  const sharePageUrl = buildSharePageUrl(params.shareId);
  const tweetText = buildTweetText(params);

  const searchParams = new URLSearchParams({
    text: tweetText,
    url: sharePageUrl,
  });

  return `https://twitter.com/intent/tweet?${searchParams.toString()}`;
}

/** Absolute URL to static banner — Twitter’s crawler reliably fetches static files. */
export function buildStaticShareBannerUrl(): string {
  return new URL("/x/X-Banner.png", SITE_URL).toString();
}

/** Mock share payload for demos until deposits persist server-side IDs. */
export const MOCK_SHARE_DEFAULTS = {
  amount: "$500",
  vaultName: "USDC Vault",
  apy: "8.2%",
  shareId: "demo",
} as const satisfies ShareTweetParams;
