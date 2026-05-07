export interface UserConnectEvent {
  wallet_address: string;
  wallet_provider: string | null;
}

export interface UserPublic {
  wallet_address: string;
  wallet_provider: string | null;
  email: string | null;
  email_verified_at: string | null;
  created_at: string;
}

export interface EmailStartRequest {
  wallet_address: string;
  email: string;
}
