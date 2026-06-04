type AuditLogInsert = {
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
};

type AssetVolumeStatsInsert = {
  network: string;
  asset_key: string;
  total_volume: number;
  touch_count: number;
  last_audit_log_id: string;
};

type AssetVolumeStatsUpdate = Partial<AssetVolumeStatsInsert> & {
  updated_at?: string;
};

export type UserInsert = {
  wallet_address: string;
  wallet_provider?: string | null;
  network: string;
  email?: string | null;
  email_verified_at?: string | null;
  auth_user_id?: string | null;
  preferences?: Record<string, unknown>;
};

export type UserRow = {
  wallet_address: string;
  wallet_provider: string | null;
  network: string;
  email: string | null;
  email_verified_at: string | null;
  auth_user_id: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type UserUpdate = Partial<UserInsert> & { updated_at?: string };

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: AuditLogInsert & { id: string; created_at: string };
        Insert: AuditLogInsert;
        Update: Partial<AuditLogInsert>;
        Relationships: [];
      };
      asset_price_history: {
        Row: {
          id: string;
          symbol: string;
          price: number;
          source: string | null;
          recorded_at: string;
        };
        Insert: {
          symbol: string;
          price: number;
          source?: string | null;
          recorded_at?: string;
        };
        Update: Partial<{
          symbol: string;
          price: number;
          source: string | null;
          recorded_at: string;
        }>;
        Relationships: [];
      };
      asset_volume_stats: {
        Row: AssetVolumeStatsInsert & {
          id: string;
          updated_at: string;
        };
        Insert: AssetVolumeStatsInsert & { id?: string; updated_at?: string };
        Update: AssetVolumeStatsUpdate;
        Relationships: [
          {
            foreignKeyName: "asset_volume_stats_last_audit_log_id_fkey";
            columns: ["last_audit_log_id"];
            isOneToOne: false;
            referencedRelation: "audit_logs";
            referencedColumns: ["id"];
          },
        ];
      };
      destination_catalog: {
        Row: {
          kind: string;
          id: string;
          name: string;
          protocol: string;
          apy: number | null;
          accepted_token_codes: string[];
          updated_at: string;
        };
        Insert: {
          kind: string;
          id: string;
          name: string;
          protocol: string;
          apy?: number | null;
          accepted_token_codes?: string[];
          updated_at?: string;
        };
        Update: Partial<{
          kind: string;
          id: string;
          name: string;
          protocol: string;
          apy: number | null;
          accepted_token_codes: string[];
          updated_at: string;
        }>;
        Relationships: [];
      };
      vault_pps_history: {
        Row: {
          vault_id: string;
          pps: string;
          apy: number | null;
          recorded_at: string;
        };
        Insert: {
          vault_id: string;
          pps: string;
          apy?: number | null;
          recorded_at?: string;
        };
        Update: Partial<{
          vault_id: string;
          pps: string;
          apy: number | null;
          recorded_at: string;
        }>;
        Relationships: [];
      };
      users: {
        Row: UserRow;
        Insert: UserInsert;
        Update: UserUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_asset_volume: {
        Args: {
          p_network: string;
          p_asset_key: string;
          p_delta: number;
          p_audit_id: string;
        };
        Returns: null;
      };
    };
    Enums: Record<string, never>;
  };
};
