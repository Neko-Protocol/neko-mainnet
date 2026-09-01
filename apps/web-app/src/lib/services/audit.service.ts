import { backendClient } from "@/lib/services/backend-client";
import type { AuditEvent, AuditLog } from "@/lib/types/audit.types";

/**
 * Fired after an audit write lands.
 *
 * The backend emits the matching in-app notification in-band with the same
 * request (`AuditService.log()` -> `NotificationsService.emit()`), so by the
 * time this resolves the row already exists. Broadcasting it lets the bell
 * refresh on the event instead of waiting out its poll interval, without every
 * action hook having to know that notifications exist.
 */
export const AUDIT_LOGGED_EVENT = "neko:audit-logged";

class AuditService {
  private readonly basePath = "/v1/audit";

  async log(event: AuditEvent): Promise<{ isFirstVaultDeposit?: boolean }> {
    try {
      const data = await backendClient.post<{ isFirstVaultDeposit?: boolean }>(
        this.basePath,
        event
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(AUDIT_LOGGED_EVENT));
      }
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

  async getVaultActivity(wallet: string): Promise<AuditLog[]> {
    try {
      return await backendClient.get<AuditLog[]>(
        `${this.basePath}/vaults/${encodeURIComponent(wallet)}`
      );
    } catch {
      return [];
    }
  }
}

export const auditService = new AuditService();
