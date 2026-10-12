import { Linking } from "react-native";
import { SignClient } from "@walletconnect/sign-client";
import type { StellarWalletKitOptions, WalletConnectAppMetadata } from "./types";

export type { StellarWalletKitOptions };

/**
 * React Native counterpart of `walletKit.ts`.
 *
 * Stellar Wallets Kit needs a browser, so on a phone the app talks to the
 * user's self-custodial wallet (LOBSTR, Freighter) over WalletConnect v2
 * directly. The object returned by `getStellarWalletKit` has the same methods
 * `useStellarWallet` calls on the web kit (`authModal`, `signTransaction`,
 * `disconnect`), plus `setWallet` / `getAddress`, so the hook and the public
 * API are shared.
 *
 * There is no modal here: the app renders its own wallet list, calls
 * `setWallet(id)` and then `connect()`.
 */

const PUBLIC_PASSPHRASE = "Public Global Stellar Network ; September 2015";

/**
 * Same namespaces and methods as the kit's WalletConnect module.
 *
 * `@walletconnect/sign-client` must stay in step with what LOBSTR accepts.
 * LOBSTR now rejects 2.20.x pairing links as "invalid or expired" and
 * approves 2.23.x ones (checked October 2026), even though 2.21+ folds
 * `requiredNamespaces` into `optionalNamespaces`. Re-test LOBSTR before
 * changing the version.
 */
const WC_CHAIN = {
  PUBLIC: "stellar:pubnet",
  TESTNET: "stellar:testnet",
} as const;

const WC_METHOD = {
  SIGN: "stellar_signXDR",
  SIGN_AND_SUBMIT: "stellar_signAndSubmitXDR",
  SIGN_MESSAGE: "stellar_signMessage",
  SIGN_AUTH_ENTRY: "stellar_signAuthEntry",
} as const;

const USER_DISCONNECTED = { code: 6000, message: "User disconnected." };

/**
 * Wallets that support Stellar over WalletConnect, with the native link from
 * the WalletConnect registry. Ids match the kit's module ids.
 */
const WALLETS: Record<string, { name: string; nativeLink: string }> = {
  lobstr: { name: "LOBSTR", nativeLink: "lobstr://" },
  freighter: { name: "Freighter", nativeLink: "freighterwallet://wc-redirect" },
};

const DEFAULT_METADATA: WalletConnectAppMetadata = {
  name: "Neko",
  description: "Neko  All-in-one platform for RWAs on Stellar",
  url: "https://nekoprotocol.xyz",
  icons: ["https://nekoprotocol.xyz/Neko.svg"],
};

type Client = Awaited<ReturnType<typeof SignClient.init>>;
type Session = ReturnType<Client["session"]["getAll"]>[number];

export interface SignTransactionResult {
  signedTxXdr: string;
}

export interface NativeStellarWalletKit {
  /** Picks the wallet the next `authModal` / `getAddress` opens. */
  setWallet(id: string): void;
  /** Opens the selected wallet, waits for approval, returns the address. */
  authModal(): Promise<{ address: string }>;
  getAddress(): Promise<{ address: string }>;
  signTransaction(
    xdr: string,
    opts?: { networkPassphrase?: string; address?: string }
  ): Promise<SignTransactionResult>;
  disconnect(): Promise<void>;
}

let config: StellarWalletKitOptions = {};
let selectedWalletId: string | null = null;
let clientPromise: Promise<Client> | null = null;

/**
 * Later calls only fill in what earlier ones left out, so the app can
 * configure the kit once at startup and the hook can call it with no options.
 */
function mergeConfig(options?: StellarWalletKitOptions): void {
  if (!options) return;
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      (config as Record<string, unknown>)[key] = value;
    }
  }
}

export function getConfiguredNetworkPassphrase(): string {
  const passphrase =
    config.networkPassphrase?.trim() ||
    process.env.EXPO_PUBLIC_STELLAR_NETWORK_PASSPHRASE?.trim();
  if (!passphrase) {
    // Never fall back to testnet silently on a phone: the app must pass it.
    throw new Error(
      "Stellar network passphrase is not configured. Call getStellarWalletKit({ networkPassphrase }) at startup."
    );
  }
  return passphrase;
}

function chainFor(passphrase: string): string {
  return passphrase === PUBLIC_PASSPHRASE ? WC_CHAIN.PUBLIC : WC_CHAIN.TESTNET;
}

/** Same rules as WalletConnect AppKit's `formatNativeUrl`. */
function formatNativeLink(appUrl: string): string {
  let url = appUrl;
  if (!url.includes("://")) {
    url = `${url.replaceAll("/", "").replaceAll(":", "")}://`;
  }
  if (!url.endsWith("/")) url = `${url}/`;
  return url;
}

async function openWallet(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    throw new Error(
      "Could not open the wallet. Make sure it is installed on this device."
    );
  }
}

function getClient(): Promise<Client> {
  clientPromise ??= (() => {
    const projectId = config.walletConnectProjectId?.trim();
    if (!projectId) {
      return Promise.reject(
        new Error(
          "WalletConnect project id is not configured. Call getStellarWalletKit({ walletConnectProjectId }) at startup."
        )
      );
    }
    return SignClient.init({
      projectId,
      metadata: {
        ...(config.appMetadata ?? DEFAULT_METADATA),
        ...(config.redirectUrl
          ? { redirect: { native: config.redirectUrl } }
          : {}),
      },
    });
  })().catch((error: unknown) => {
    // Let the next call retry instead of caching the failure.
    clientPromise = null;
    throw error;
  });
  return clientPromise;
}

function isLive(session: Session): boolean {
  return session.expiry * 1000 > Date.now();
}

function findSession(client: Client, address: string): Session | undefined {
  return client.session
    .getAll()
    .find(
      (session) =>
        isLive(session) &&
        session.namespaces.stellar?.accounts.some((account) =>
          account.endsWith(`:${address}`)
        )
    );
}

/** The link that brings the paired wallet to the front for a request. */
function walletLinkFor(session: Session): string | null {
  const advertised = session.peer.metadata.redirect?.native;
  if (advertised) return advertised;
  const known = selectedWalletId ? WALLETS[selectedWalletId] : undefined;
  return known ? formatNativeLink(known.nativeLink) : null;
}

async function connectSelectedWallet(): Promise<{ address: string }> {
  const wallet = selectedWalletId ? WALLETS[selectedWalletId] : undefined;
  if (!wallet) {
    throw new Error(
      `Choose a wallet with setWallet() first. Supported: ${Object.keys(WALLETS).join(", ")}.`
    );
  }

  const client = await getClient();
  const chains = [chainFor(getConfiguredNetworkPassphrase())];
  const { uri, approval } = await client.connect({
    requiredNamespaces: {
      stellar: { methods: [WC_METHOD.SIGN], chains, events: [] },
    },
    optionalNamespaces: {
      stellar: {
        methods: [
          WC_METHOD.SIGN_AND_SUBMIT,
          WC_METHOD.SIGN_AUTH_ENTRY,
          WC_METHOD.SIGN_MESSAGE,
        ],
        chains,
        events: [],
      },
    },
  });
  if (!uri) throw new Error("WalletConnect did not return a pairing URI.");

  await openWallet(
    `${formatNativeLink(wallet.nativeLink)}wc?uri=${encodeURIComponent(uri)}`
  );

  const session = await approval();
  const account = session.namespaces.stellar?.accounts[0];
  const address = account?.split(":")[2];
  if (!address) throw new Error("The wallet did not share a Stellar account.");
  return { address };
}

const nativeKit: NativeStellarWalletKit = {
  setWallet(id) {
    if (!WALLETS[id]) {
      throw new Error(
        `Unsupported wallet "${id}". Supported: ${Object.keys(WALLETS).join(", ")}.`
      );
    }
    selectedWalletId = id;
  },

  authModal: connectSelectedWallet,
  getAddress: connectSelectedWallet,

  async signTransaction(xdr, opts) {
    if (!opts?.address) throw new Error("Wallet not connected");
    const client = await getClient();
    const session = findSession(client, opts.address);
    if (!session) {
      throw new Error(
        "No WalletConnect session found or it expired for the selected address."
      );
    }

    const request = client.request<{ signedXDR: string }>({
      topic: session.topic,
      chainId: chainFor(
        opts.networkPassphrase ?? getConfiguredNetworkPassphrase()
      ),
      request: { method: WC_METHOD.SIGN, params: { xdr } },
    });

    // The request is already on its way; bring the wallet up so the user can
    // approve it. It sends them back through `redirectUrl` when done.
    const link = walletLinkFor(session);
    if (link) void openWallet(link).catch(() => {});

    const { signedXDR } = await request;
    return { signedTxXdr: signedXDR };
  },

  async disconnect() {
    // Telling the wallet goes through the relay and can take seconds, or hang
    // if the socket is asleep. The user is disconnected locally right away;
    // the sessions are closed in the background.
    void getClient()
      .then((client) =>
        Promise.all(
          client.session
            .getAll()
            .map((session) =>
              client
                .disconnect({ topic: session.topic, reason: USER_DISCONNECTED })
                .catch(() => {})
            )
        )
      )
      .catch(() => {});
  },
};

export async function getStellarWalletKit(
  options?: StellarWalletKitOptions
): Promise<NativeStellarWalletKit> {
  mergeConfig(options);
  return nativeKit;
}
