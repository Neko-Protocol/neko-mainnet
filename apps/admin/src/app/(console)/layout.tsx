import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/navigation/AdminSidebar";
import { AdminMobileHeader } from "@/components/navigation/AdminMobileHeader";

export default async function ConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-neko-dark text-white">
      <AdminSidebar userEmail={user.email} />
      <AdminMobileHeader userEmail={user.email} />
      <div className="p-4 pt-20 sm:p-6 sm:pt-24 lg:ml-[270px] lg:pt-6">
        <main>{children}</main>
      </div>
    </div>
  );
}
