type AuditLogInsert = {
  wallet_address: string;
  action_type: string;
  asset_in: string | null;
  asset_out: string | null;
  amount_in: number | null;
  amount_out: number | null;
  pool_id: string | null;
  network: string;
  tx_hash: string | null;
};

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: AuditLogInsert & { id: string; created_at: string };
        Insert: AuditLogInsert;
        Update: Partial<AuditLogInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
