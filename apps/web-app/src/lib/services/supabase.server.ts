import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

let _client: SupabaseClient<Database> | null | undefined;

export function getSupabaseAdmin(): SupabaseClient<Database> | null {
  if (_client !== undefined) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  _client =
    url && key
      ? createClient<Database>(url, key, { auth: { persistSession: false } })
      : null;
  return _client;
}

export function dbNetwork(): string {
  const envNet =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK?.trim().toUpperCase() ?? "";
  if (envNet === "MAINNET" || envNet === "PUBLIC") return "mainnet";
  return "testnet";
}
