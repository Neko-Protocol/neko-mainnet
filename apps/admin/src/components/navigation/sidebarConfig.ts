import { LayoutDashboard, Send, Users } from "lucide-react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Analytics", href: "/analytics", icon: LayoutDashboard },
  { label: "Referrals", href: "/analytics/referrals", icon: Users },
  { label: "Mailing", href: "/analytics/mailing", icon: Send },
];
