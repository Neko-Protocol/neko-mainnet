export interface WalletConnectAppMetadata {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

export interface StellarWalletKitOptions {
  networkPassphrase?: string;
  /**
   * Whether to load the WalletConnect bridge module.
   *
   * It is the most expensive thing the kit pulls in — WalletConnect drags in
   * `@reown/appkit` and `viem` behind it — and it is only ever needed once the
   * user is actually choosing or using a wallet.
   *
   * Defaults to true so that every existing caller keeps the full module list.
   * Opt out only where the bridge provably cannot be the answer; the in-app
   * browser probe is the one such caller, and it already refuses to
   * auto-connect a BRIDGE_WALLET.
   *
   * Ignored on React Native, where WalletConnect is the only transport.
   */
  includeBridge?: boolean;
  /**
   * React Native only. Expo does not inline `EXPO_PUBLIC_*` variables inside
   * `node_modules`, so the app passes its WalletConnect project id here. The
   * web reads `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.
   */
  walletConnectProjectId?: string;
  /** React Native only. Shown by the wallet when it asks to approve a session. */
  appMetadata?: WalletConnectAppMetadata;
  /**
   * React Native only. Deep link the wallet opens after the user approves or
   * signs, so the user lands back in the app (for example
   * `neko://wallet/callback`).
   */
  redirectUrl?: string;
}

export interface StellarWalletState {
  address: string | null;
  walletName: string | null;
  setWallet: (payload: { address: string; walletName: string }) => void;
  clearWallet: () => void;
}
