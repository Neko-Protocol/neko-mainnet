"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "./sidebarConfig";
import { SignOutButton } from "./SignOutButton";

export function AdminSidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/analytics"
      ? pathname === "/analytics"
      : pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-[270px] flex-col border-r border-white/5 bg-[#121212]">
      <Link href="/analytics" className="flex items-center pt-12 pb-6 px-6">
        <Image
          src="/Neko.svg"
          alt="Neko Logo"
          width={90}
          height={90}
          className="w-auto"
        />
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-3 min-h-0 overflow-y-auto">
        {ADMIN_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 text-base font-medium transition-colors duration-150 ${
                active ? "text-white" : "text-white/35 hover:text-white/65"
              }`}
              style={
                active
                  ? { background: "#222222", borderRadius: "84px" }
                  : { borderRadius: "84px" }
              }
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${
                  active ? "text-white" : "text-white/35"
                }`}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-white/5 p-4">
        <span className="min-w-0 truncate text-xs text-white/50">
          {userEmail}
        </span>
        <SignOutButton />
      </div>
    </aside>
  );
}
