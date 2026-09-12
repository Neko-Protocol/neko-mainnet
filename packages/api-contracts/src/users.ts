export interface UserPreferences {
  currency?: string;
  ui_mode?: string | null;
}

export interface UserConnectEvent {
  wallet_address: string;
  wallet_provider: string | null;
  ref_code?: string | null;
}

export interface UserPublic {
  wallet_address: string;
  wallet_provider: string | null;
  email: string | null;
  email_verified_at: string | null;
  created_at: string;
  preferences: UserPreferences;
  terms_accepted_at: string | null;
  terms_version: string | null;
  privacy_accepted_at: string | null;
  privacy_version: string | null;
}

export interface AcceptLegalRequest {
  wallet_address: string;
  terms_version: string;
  privacy_version: string;
}

export interface EmailStartRequest {
  wallet_address: string;
  email: string;
}

export interface EmailConfirmRequest {
  wallet: string;
  access_token: string;
}
