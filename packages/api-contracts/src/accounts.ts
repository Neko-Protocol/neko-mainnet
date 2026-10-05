export type WalletChain = "stellar";

export type WalletNetwork = "testnet" | "mainnet";

export type WalletKind = "embedded" | "external";

export type WalletActivationStatus =
  | "not_activated"
  | "pending"
  | "activated"
  | "failed";

export interface WalletPublic {
  id: string;
  chain: WalletChain;
  network: WalletNetwork;
  address: string;
  kind: WalletKind;
  is_primary: boolean;
  activation_status: WalletActivationStatus;
  activation_tx_hash: string | null;
  created_at: string;
}

export interface AccountPublic {
  id: string;
  email: string | null;
  display_name: string | null;
  country: string | null;
  locale: string | null;
  terms_version: string | null;
  terms_accepted_at: string | null;
  created_at: string;
}

export interface MeResponse {
  account: AccountPublic;
  wallets: WalletPublic[];
  needs_profile: boolean;
}

export interface BootstrapResponse extends MeResponse {
  created: boolean;
}

export interface UpdateProfileRequest {
  display_name?: string;
  country?: string;
  locale?: string;
  terms_version?: string;
}

export interface ActivationPrepareResponse {
  xdr: string;
  hash: string;
  network_passphrase: string;
  sponsor_address: string;
}

export interface ActivationSubmitRequest {
  signedXdr: string;
}

export interface ActivationSubmitResponse {
  wallet: WalletPublic;
  hash: string;
}
