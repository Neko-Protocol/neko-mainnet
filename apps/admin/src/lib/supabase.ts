import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null | undefined;

export type AuditLog = {
  id: string;
  wallet_address: string;
  action_type: string;
  asset_in: string | null;
  asset_out: string | null;
  amount_in: number | null;
  token_amount_in: number | null;
  amount_out: number | null;
  pool_id: string | null;
  network: string;
  tx_hash: string | null;
  created_at: string;
};

export type UserRow = {
  wallet_address: string;
  wallet_provider: string | null;
  network: string;
  email: string | null;
  email_verified_at: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
};

export type AssetVolumeStats = {
  id: string;
  network: string;
  asset_key: string;
  total_volume: number;
  touch_count: number;
  updated_at: string;
};

export function getSupabaseAdmin(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  _client =
    url && key
      ? createClient(url, key, { auth: { persistSession: false } })
      : null;
  return _client;
}
