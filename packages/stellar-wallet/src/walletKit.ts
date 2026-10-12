"use client";

import type { StellarWalletsKit as StellarWalletsKitClass } from "@creit.tech/stellar-wallets-kit";
import type {
  ModuleInterface,
  Networks,
} from "@creit.tech/stellar-wallets-kit/types";
import type { StellarWalletKitOptions } from "./types";

type Kit = typeof StellarWalletsKitClass;

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

const THEME = {
  background: "#1C1C1C",
  "background-secondary": "#121212",
  "foreground-strong": "#FFFFFF",
  foreground: "rgba(255,255,255,0.85)",
  "foreground-secondary": "rgba(255,255,255,0.6)",
  primary: "#229EDF",
  "primary-foreground": "#FFFFFF",
  transparent: "rgba(0, 0, 0, 0)",
  lighter: "rgba(255,255,255,0.08)",
  light: "rgba(255,255,255,0.06)",
  "light-gray": "rgba(255,255,255,0.35)",
  gray: "rgba(255,255,255,0.25)",
  danger: "oklch(57.7% 0.245 27.325)",
  border: "rgba(255,255,255,0.08)",
  shadow: "0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -4px rgba(0,0,0,0.2)",
  "border-radius": "0.75rem",
  "font-family": "inherit",
};

let Kit: Kit | null = null;
let network: Networks;
/** The live module instances. Appended to, never rebuilt — see `apply`. */
let modules: ModuleInterface[] = [];
let basePromise: Promise<Kit> | null = null;
let bridgePromise: Promise<Kit> | null = null;

export type { StellarWalletKitOptions };

export function getConfiguredNetworkPassphrase(): string {
  return (
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE?.trim() ||
    TESTNET_PASSPHRASE
  );
}

/**
 * `init` only reassigns the kit's module signal, so calling it again with a
 * longer list adds to what the kit knows without disturbing the selected
 * wallet — as long as the existing module *instances* are reused, which is why
 * `modules` is appended to rather than rebuilt.
 */
function apply(): void {
  Kit!.init({ network, modules, theme: THEME });
}

async function loadBase(options?: StellarWalletKitOptions): Promise<Kit> {
  const [
    { StellarWalletsKit },
    { FreighterModule },
    { AlbedoModule },
    { xBullModule },
    { LedgerModule },
    { LobstrModule },
  ] = await Promise.all([
    import("@creit.tech/stellar-wallets-kit"),
    import("@creit.tech/stellar-wallets-kit/modules/freighter"),
    import("@creit.tech/stellar-wallets-kit/modules/albedo"),
    import("@creit.tech/stellar-wallets-kit/modules/xbull"),
    import("@creit.tech/stellar-wallets-kit/modules/ledger"),
    import("@creit.tech/stellar-wallets-kit/modules/lobstr"),
  ]);

  Kit = StellarWalletsKit;
  network = (options?.networkPassphrase ??
    getConfiguredNetworkPassphrase()) as Networks;
  modules = [
    new FreighterModule(),
    new AlbedoModule(),
    new xBullModule(),
    new LedgerModule(),
    new LobstrModule(),
  ];
  apply();
  return StellarWalletsKit;
}

async function loadBridge(): Promise<Kit> {
  const projectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";
  // Without a project id the module could never be instantiated, so importing
  // it would download WalletConnect for nothing.
  if (!projectId) return Kit!;

  const { WalletConnectModule } =
    await import("@creit.tech/stellar-wallets-kit/modules/wallet-connect");
  modules.push(
    new WalletConnectModule({
      projectId,
      metadata: {
        name: "Neko",
        description: "Neko  All-in-one platform for RWAs on Stellar",
        url: "https://nekoprotocol.xyz",
        icons: ["/Neko.svg"],
      },
    })
  );
  apply();
  return Kit!;
}

export async function getStellarWalletKit(
  options?: StellarWalletKitOptions
): Promise<Kit> {
  if (typeof window === "undefined") {
    throw new Error("Stellar Wallet Kit can only be used in the browser.");
  }

  basePromise ??= loadBase(options);
  const kit = await basePromise;

  if (options?.includeBridge === false) return kit;

  bridgePromise ??= loadBridge();
  return bridgePromise;
}
