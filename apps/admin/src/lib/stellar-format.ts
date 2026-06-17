export function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

export function stellarExpertTxUrl(hash: string): string {
  const network =
    (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET").toUpperCase() ===
      "PUBLIC" ||
    (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET").toUpperCase() ===
      "MAINNET"
      ? "public"
      : "testnet";
  return `https://stellar.expert/explorer/${network}/tx/${hash}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
