export interface UserPreferences {
  currency?: string;
  ui_mode?: string | null;
  /** Expo push tokens, one per device the user installed the mobile app on. */
  push_tokens?: string[];
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
}

export interface EmailStartRequest {
  wallet_address: string;
  email: string;
}

export interface EmailConfirmRequest {
  wallet: string;
  access_token: string;
}
