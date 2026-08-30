import { z } from "zod";
import { resolveRpcUrl } from "@/lib/config/resolveRpcUrl";
import { Networks as WalletNetwork } from "@creit.tech/stellar-wallets-kit/types";

export type NetworkType = "mainnet" | "testnet" | "futurenet" | "custom";
export interface Network {
  id: NetworkType;
  label: string;
  passphrase: string;
  rpcUrl: string;
  horizonUrl: string;
}

const envSchema = z.object({
  PUBLIC_STELLAR_NETWORK: z.enum([
    "PUBLIC",
    "FUTURENET",
    "TESTNET",
    "LOCAL",
    "STANDALONE", // deprecated in favor of LOCAL
  ] as const),
  PUBLIC_STELLAR_NETWORK_PASSPHRASE: z.nativeEnum(WalletNetwork),
  PUBLIC_STELLAR_RPC_URL: z.string(),
  PUBLIC_STELLAR_HORIZON_URL: z.string(),
});

const stellarNetworkEnv =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === "MAINNET"
    ? "PUBLIC"
    : process.env.NEXT_PUBLIC_STELLAR_NETWORK;

const envVars = {
  PUBLIC_STELLAR_NETWORK: stellarNetworkEnv,
  PUBLIC_STELLAR_NETWORK_PASSPHRASE:
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE,
  PUBLIC_STELLAR_RPC_URL: process.env.NEXT_PUBLIC_STELLAR_RPC_URL,
  PUBLIC_STELLAR_HORIZON_URL: process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL,
};
const parsed = envSchema.safeParse(envVars);

const env: z.infer<typeof envSchema> = parsed.success
  ? parsed.data
  : {
      PUBLIC_STELLAR_NETWORK: "LOCAL",
      PUBLIC_STELLAR_NETWORK_PASSPHRASE: WalletNetwork.STANDALONE,
      PUBLIC_STELLAR_RPC_URL: "http://localhost:8000/rpc",
      PUBLIC_STELLAR_HORIZON_URL: "http://localhost:8000",
    };

export const stellarNetwork =
  env.PUBLIC_STELLAR_NETWORK === "STANDALONE"
    ? "LOCAL"
    : env.PUBLIC_STELLAR_NETWORK;
export const networkPassphrase = env.PUBLIC_STELLAR_NETWORK_PASSPHRASE;

const stellarEncode = (str: string) => {
  return str.replace(/\//g, "//").replace(/;/g, "/;");
};

/**
 * The RPC URL to hand to external tools such as Stellar Lab.
 *
 * When the app routes through the gateway, `rpcUrl` is a path on our own
 * origin that requires an internal key — useless to a third-party tool. Fall
 * back to the network's public RPC so those links keep working.
 */
export function externalRpcUrl(): string {
  const configured = env.PUBLIC_STELLAR_RPC_URL;
  if (!configured.startsWith("/")) return configured;

  switch (stellarNetwork) {
    case "PUBLIC":
      return "https://mainnet.sorobanrpc.com";
    case "TESTNET":
      return "https://soroban-testnet.stellar.org";
    case "FUTURENET":
      return "https://rpc-futurenet.stellar.org";
    default:
      return "http://localhost:8000/rpc";
  }
}

export const labPrefix = () => {
  switch (stellarNetwork) {
    case "LOCAL":
      return `http://localhost:8000/lab/transaction-dashboard?$=network$id=custom&label=Custom&horizonUrl=${stellarEncode(horizonUrl)}&rpcUrl=${stellarEncode(externalRpcUrl())}&passphrase=${stellarEncode(networkPassphrase)};`;
    case "PUBLIC":
      return `https://lab.stellar.org/transaction-dashboard?$=network$id=mainnet&label=Mainnet&horizonUrl=${stellarEncode(horizonUrl)}&rpcUrl=${stellarEncode(externalRpcUrl())}&passphrase=${stellarEncode(networkPassphrase)};`;
    case "TESTNET":
      return `https://lab.stellar.org/transaction-dashboard?$=network$id=testnet&label=Testnet&horizonUrl=${stellarEncode(horizonUrl)}&rpcUrl=${stellarEncode(externalRpcUrl())}&passphrase=${stellarEncode(networkPassphrase)};`;
    case "FUTURENET":
      return `https://lab.stellar.org/transaction-dashboard?$=network$id=futurenet&label=Futurenet&horizonUrl=${stellarEncode(horizonUrl)}&rpcUrl=${stellarEncode(externalRpcUrl())}&passphrase=${stellarEncode(networkPassphrase)};`;
    default:
      return `https://lab.stellar.org/transaction-dashboard?$=network$id=testnet&label=Testnet&horizonUrl=${stellarEncode(horizonUrl)}&rpcUrl=${stellarEncode(externalRpcUrl())}&passphrase=${stellarEncode(networkPassphrase)};`;
  }
};

export const rpcUrl = resolveRpcUrl(env.PUBLIC_STELLAR_RPC_URL);

export const allowHttpForSoroban =
  typeof rpcUrl === "string" && rpcUrl.startsWith("http:");

export const horizonUrl = env.PUBLIC_STELLAR_HORIZON_URL;

const networkToId = (network: string): NetworkType => {
  switch (network) {
    case "PUBLIC":
      return "mainnet";
    case "TESTNET":
      return "testnet";
    case "FUTURENET":
      return "futurenet";
    default:
      return "custom";
  }
};

export const STELLAR_DECIMALS = 7;

export const network: Network = {
  id: networkToId(stellarNetwork),
  label: stellarNetwork.toLowerCase(),
  passphrase: networkPassphrase,
  rpcUrl: rpcUrl,
  horizonUrl: horizonUrl,
};
