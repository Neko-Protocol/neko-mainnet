import { backendClient } from "@/lib/services/backend-client";
import type { AuditEvent, AuditLog } from "@/lib/types/audit.types";

class AuditService {
  private readonly basePath = "/v1/audit";

  async log(event: AuditEvent): Promise<{ isFirstVaultDeposit?: boolean }> {
    try {
      const data = await backendClient.post<{ isFirstVaultDeposit?: boolean }>(
        this.basePath,
        event
      );
      return { isFirstVaultDeposit: data.isFirstVaultDeposit };
    } catch {
      return {};
    }
  }

  async getActivity(wallet?: string, limit = 50): Promise<AuditLog[]> {
    try {
      const params = new URLSearchParams({
        limit: String(Math.min(limit, 50)),
      });
      if (wallet) params.set("wallet", wallet);
      return await backendClient.get<AuditLog[]>(`${this.basePath}?${params}`);
    } catch {
      return [];
    }
  }
}

export const auditService = new AuditService();
