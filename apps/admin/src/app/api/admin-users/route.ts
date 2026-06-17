import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAdminUsers } from "@/lib/invitations";
import { requireAdminSession } from "@/lib/require-admin";

export async function GET(request: NextRequest) {
  const denied = requireAdminSession(request);
  if (denied) return denied;

  const admins = await getAdminUsers();
  return NextResponse.json({ emails: admins.map((a) => a.email) });
}
