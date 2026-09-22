"use server";

import type { AdminEmail } from "@neko-protocol/api-contracts";
import { fetchFromBackend, mutateBackend } from "@/lib/services/backend-client";
import { getActingAdminEmail } from "@/features/mailing/actingAdmin";

const ADMINS = "admin/admins";

export async function fetchAdmins(): Promise<AdminEmail[]> {
  return fetchFromBackend<AdminEmail[]>(ADMINS);
}

export async function addAdmin(email: string): Promise<AdminEmail> {
  const added_by = await getActingAdminEmail();
  return mutateBackend<AdminEmail>("POST", ADMINS, {
    email,
    ...(added_by ? { added_by } : {}),
  });
}

export async function setAdminActive(
  email: string,
  isActive: boolean
): Promise<AdminEmail> {
  return mutateBackend<AdminEmail>(
    "PATCH",
    `${ADMINS}/${encodeURIComponent(email)}`,
    { is_active: isActive }
  );
}
