import type { AuditEvent, AuditLog } from "@/lib/types/audit.types";

class AuditService {
  private readonly baseUrl = "/api/audit";

  async log(event: AuditEvent): Promise<void> {
    try {
      await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    } catch {
      // fire-and-forget  never propagate errors
    }
  }

  async getActivity(wallet?: string, limit = 50): Promise<AuditLog[]> {
    try {
      const params = new URLSearchParams({
        limit: String(Math.min(limit, 50)),
      });
      if (wallet) params.set("wallet", wallet);
      const res = await fetch(`${this.baseUrl}?${params}`);
      if (!res.ok) return [];
      return (await res.json()) as AuditLog[];
    } catch {
      return [];
    }
  }
}

export const auditService = new AuditService();
