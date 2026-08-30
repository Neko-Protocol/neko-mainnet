import { Bell, LayoutDashboard, Send, ShieldCheck, Users } from "lucide-react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Analytics", href: "/analytics", icon: LayoutDashboard },
  { label: "Referrals", href: "/referrals", icon: Users },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Mailing", href: "/mailing", icon: Send },
  { label: "Admins", href: "/admins", icon: ShieldCheck },
];
