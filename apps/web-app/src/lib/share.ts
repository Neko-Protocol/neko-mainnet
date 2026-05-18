/** Public vaults URL used in deposit-success tweets (Twitter Card target). */
export const DAPP_VAULTS_PUBLIC_URL =
  "https://dapp.nekoprotocol.xyz/vaults" as const;

/** Deployed dapp origin (`metadataBase`, canonical URLs for social). */
export const DAPP_PUBLIC_ORIGIN = new URL(DAPP_VAULTS_PUBLIC_URL).origin;

/** OG / Twitter large card — absolute URL for root layout metadata. */
export const DAPP_SOCIAL_CARD_IMAGE =
  "https://dapp.nekoprotocol.xyz/x/X-Banner.png" as const;

export type VaultDepositShareIntentParams = {
  vaultName: string;
  apy: number | string;
};

export function buildVaultDepositSuccessTweetBody(
  vaultName: string,
  apy: number | string
): string {
  const apyFormatted =
    typeof apy === "number" ? apy.toFixed(2) : apy.trim().replace(/%$/, "");

  return `Just made my first deposit into a @NekoProto vault! 🔥

${vaultName} · ${apyFormatted}% APY

Now earning yield from Real-World Assets

Time to put your RWAs to work 👇🏼
${DAPP_VAULTS_PUBLIC_URL}
pic.twitter.com/XpHz5jwCAx`;
}

export function generateVaultDepositShareIntentUrl(
  params: VaultDepositShareIntentParams
): string {
  const text = buildVaultDepositSuccessTweetBody(params.vaultName, params.apy);
  return `https://twitter.com/intent/tweet?${new URLSearchParams({ text }).toString()}`;
}
