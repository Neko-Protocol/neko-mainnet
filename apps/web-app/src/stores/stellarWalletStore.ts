// Wallet connection state now lives in the shared @neko/stellar-wallet
// package so the admin app can reuse it; this re-export keeps the historical
// import path working across the web-app.
export {
  useStellarWalletStore,
  type StellarWalletState,
} from "@neko/stellar-wallet";
