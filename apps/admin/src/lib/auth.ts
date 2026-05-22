import bcrypt from "bcryptjs";
import { TOTP, Secret } from "otpauth";
import { getSupabaseAdmin } from "@/lib/supabase";

type AdminUser = {
  id: string;
  email: string;
  password_hash: string;
  totp_secret: string;
  is_active: boolean;
};

export async function findAdminUser(email: string): Promise<AdminUser | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase
    .from("admin_users")
    .select("id, email, password_hash, totp_secret, is_active")
    .eq("email", email.toLowerCase().trim())
    .eq("is_active", true)
    .single();
  return data ?? null;
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function verifyTOTP(token: string, base32Secret: string): boolean {
  try {
    const totp = new TOTP({
      issuer: "Neko Admin",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(base32Secret),
    });
    return totp.validate({ token, window: 1 }) !== null;
  } catch {
    return false;
  }
}

export function generateTOTPSecret(): string {
  return new Secret().base32;
}

export function getTOTPUri(email: string, base32Secret: string): string {
  const totp = new TOTP({
    issuer: "Neko Admin",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(base32Secret),
  });
  return totp.toString();
}

export { makeSessionToken, isValidSession } from "./auth-session";
