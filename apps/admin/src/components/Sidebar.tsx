"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <aside className="flex h-screen w-56 flex-col bg-[#161616] border-r border-white/8">
      <div className="border-b border-white/8 px-4 py-5">
        <Image
          src="/Neko.svg"
          alt="Neko"
          width={96}
          height={32}
          className="h-8 w-auto object-contain"
          priority
        />
      </div>
      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-white/8 text-[#229EDF]"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/8 p-2">
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/65 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="size-4" aria-hidden />
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
