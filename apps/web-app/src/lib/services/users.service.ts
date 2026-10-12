import { backendClient, BackendError } from "@/lib/services/backend-client";
import type {
  UserConnectEvent,
  UserPreferences,
  UserPublic,
} from "@/lib/types/user.types";

class UsersService {
  async register(event: UserConnectEvent): Promise<void> {
    try {
      await backendClient.post("/users", event);
    } catch {
      // fire-and-forget - never propagate errors
    }
  }

  async get(wallet: string): Promise<UserPublic | null> {
    try {
      const json = await backendClient.get<UserPublic | null>(
        `/users?wallet=${encodeURIComponent(wallet)}`
      );
      return json && typeof json === "object" ? json : null;
    } catch {
      return null;
    }
  }

  async updatePreferences(
    wallet: string,
    prefs: Partial<UserPreferences>
  ): Promise<void> {
    try {
      await backendClient.post("/users/preferences", {
        wallet_address: wallet,
        preferences: prefs,
      });
    } catch {
      // fire-and-forget - never propagate errors
    }
  }

  async acceptLegal(
    wallet: string,
    termsVersion: string,
    privacyVersion: string
  ): Promise<{ ok: boolean }> {
    try {
      await backendClient.post("/users/legal", {
        wallet_address: wallet,
        terms_version: termsVersion,
        privacy_version: privacyVersion,
      });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  async startEmailVerification(
    wallet: string,
    email: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await backendClient.post("/users/email/start", {
        wallet_address: wallet,
        email,
      });
      return { ok: true };
    } catch (e) {
      if (e instanceof BackendError) return { ok: false, error: e.code };
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

export const usersService = new UsersService();
