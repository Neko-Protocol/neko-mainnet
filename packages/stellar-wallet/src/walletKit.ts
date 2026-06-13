"use client";

import type { StellarWalletsKit as StellarWalletsKitClass } from "@creit.tech/stellar-wallets-kit";
import type { Networks } from "@creit.tech/stellar-wallets-kit/types";

type Kit = typeof StellarWalletsKitClass;

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

let kit: Kit | null = null;
let initPromise: Promise<Kit> | null = null;

export interface StellarWalletKitOptions {
  networkPassphrase?: string;
}

export function getConfiguredNetworkPassphrase(): string {
  return (
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE?.trim() ||
    TESTNET_PASSPHRASE
  );
}

export async function getStellarWalletKit(
  options?: StellarWalletKitOptions
): Promise<Kit> {
  if (typeof window === "undefined") {
    throw new Error("Stellar Wallet Kit can only be used in the browser.");
  }

  if (kit) return kit;

  if (!initPromise) {
    initPromise = (async () => {
      const [
        { StellarWalletsKit },
        { FreighterModule },
        { AlbedoModule },
        { xBullModule },
        { LedgerModule },
        { LobstrModule },
        { WalletConnectModule },
      ] = await Promise.all([
        import("@creit.tech/stellar-wallets-kit"),
        import("@creit.tech/stellar-wallets-kit/modules/freighter"),
        import("@creit.tech/stellar-wallets-kit/modules/albedo"),
        import("@creit.tech/stellar-wallets-kit/modules/xbull"),
        import("@creit.tech/stellar-wallets-kit/modules/ledger"),
        import("@creit.tech/stellar-wallets-kit/modules/lobstr"),
        import("@creit.tech/stellar-wallets-kit/modules/wallet-connect"),
      ]);

      const network = (options?.networkPassphrase ??
        getConfiguredNetworkPassphrase()) as Networks;

      const walletConnectProjectId =
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";

      const modules = [
        new FreighterModule(),
        new AlbedoModule(),
        new xBullModule(),
        new LedgerModule(),
        new LobstrModule(),
      ];

      if (walletConnectProjectId) {
        modules.push(
          new WalletConnectModule({
            projectId: walletConnectProjectId,
            metadata: {
              name: "Neko",
              description: "Neko  All-in-one platform for RWAs on Stellar",
              url: "https://nekoprotocol.xyz",
              icons: ["/Neko.svg"],
            },
          })
        );
      }

      StellarWalletsKit.init({
        network,
        modules,
        theme: {
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
          shadow:
            "0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -4px rgba(0,0,0,0.2)",
          "border-radius": "0.75rem",
          "font-family": "inherit",
        },
      });

      kit = StellarWalletsKit;
      return StellarWalletsKit;
    })();
  }

  return initPromise;
}
