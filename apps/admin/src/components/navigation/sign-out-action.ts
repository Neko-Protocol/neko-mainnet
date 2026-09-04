"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_SESSION_COOKIE, deleteAdminSession } from "@/lib/admin-session";

/** Explicit sign-out cleans up the session row immediately instead of
 * leaving it to expire on its own at expires_at. */
export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  await deleteAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  cookieStore.delete(ADMIN_SESSION_COOKIE);

  const supabase = await createClient();
  await supabase.auth.signOut();
}
