"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  LogOut,
  Mail,
  Share2,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { logout } from "@/lib/auth-actions";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Mail },
  { href: "/dashboard/strategies", label: "Strategies", icon: Target },
  { href: "/dashboard/recommended", label: "Recommended", icon: Sparkles },
  { href: "/dashboard/activations", label: "Activations", icon: Zap },
  { href: "/dashboard/referrals", label: "Referrals", icon: Share2 },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 z-40 flex w-full shrink-0 border-b border-admin-border bg-admin-sidebar/95 backdrop-blur-xl lg:h-dvh lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex h-16 shrink-0 items-center border-admin-border px-4 lg:h-20 lg:border-b lg:px-5">
        <Image
          src="/Neko.svg"
          alt="Neko"
          width={96}
          height={32}
          className="h-7 w-auto object-contain lg:h-8"
          priority
        />
        <span className="ml-3 border-l border-admin-border pl-3 font-label text-[10px] font-medium uppercase tracking-[0.18em] text-admin-muted">
          Admin
        </span>
      </div>
      <nav
        aria-label="Admin navigation"
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-y-auto lg:p-3"
      >
        {links.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium focus-visible:bg-white/[0.06] focus-visible:text-neko-blue focus-visible:outline-none ${
                isActive
                  ? "bg-white/[0.045] text-neko-blue"
                  : "text-admin-muted hover:bg-white/[0.035] hover:text-admin-text"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="hidden border-t border-admin-border p-3 lg:block">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-admin-muted hover:bg-admin-danger/10 hover:text-admin-danger"
        >
          <LogOut className="size-4" aria-hidden />
          Log out
        </button>
      </div>
    </aside>
  );
}
