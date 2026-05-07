import type { UserConnectEvent, UserPublic } from "@/lib/types/user.types";

class UsersService {
  private readonly base = "/api/users";

  async register(event: UserConnectEvent): Promise<void> {
    try {
      await fetch(this.base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    } catch {
      // fire-and-forget - never propagate errors
    }
  }

  async get(wallet: string): Promise<UserPublic | null> {
    try {
      const res = await fetch(
        `${this.base}?wallet=${encodeURIComponent(wallet)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      const json = (await res.json()) as UserPublic | null;
      return json && typeof json === "object" ? json : null;
    } catch {
      return null;
    }
  }

  async startEmailVerification(
    wallet: string,
    email: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.base}/email/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: wallet, email }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        return { ok: false, error: body.error ?? `http_${res.status}` };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

export const usersService = new UsersService();
