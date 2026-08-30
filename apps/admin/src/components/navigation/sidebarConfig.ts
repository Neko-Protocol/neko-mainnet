import {
  Activity,
  LayoutDashboard,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Analytics", href: "/analytics", icon: LayoutDashboard },
  { label: "Referrals", href: "/analytics/referrals", icon: Users },
  { label: "Mailing", href: "/analytics/mailing", icon: Send },
  { label: "Admins", href: "/analytics/admins", icon: ShieldCheck },
  {
    label: "Infrastructure",
    href: "/analytics/infrastructure",
    icon: Activity,
  },
];
