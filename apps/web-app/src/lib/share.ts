export const SITE_URL = "https://nekoprotocol.xyz" as const;

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

function buildTweetText(params: ShareTweetParams): string {
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

/** Mock share payload for demos until deposits persist server-side IDs. */
export const MOCK_SHARE_DEFAULTS = {
  amount: "$500",
  vaultName: "USDC Vault",
  apy: "8.2%",
  shareId: "demo",
} as const satisfies ShareTweetParams;
