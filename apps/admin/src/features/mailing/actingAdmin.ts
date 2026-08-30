"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Email of the signed-in admin, used to attribute created_by to a real
 * admin_emails row. Read server-side from the session rather than accepted
 * from the client, so it can't be spoofed by the browser.
 */
export async function getActingAdminEmail(): Promise<string | undefined> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email ?? undefined;
  } catch {
    return undefined;
  }
}
