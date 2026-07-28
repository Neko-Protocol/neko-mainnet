import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  BarChart2,
  Layers,
  Settings,
  Shield,
  Vault,
  ShoppingCart,
} from "lucide-react";
import type { UIMode } from "@/features/shared/ui-mode/stores/ui-mode.store";

export function getNavItems(
  mode: UIMode | null,
  isAdmin: boolean
): { label: string; href: string; icon: React.ElementType }[] {
  return [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Discover", href: "/discover", icon: BarChart2 },
    { label: "Pools", href: "/pools", icon: Landmark },
    ...(mode !== "basic"
      ? [{ label: "Swap", href: "/swap", icon: ArrowLeftRight }]
      : [{ label: "Cart", href: "/cart", icon: ShoppingCart }]),
    { label: "Vault", href: "/vaults", icon: Vault },
    { label: "Strategies", href: "/strategies", icon: Layers },
    { label: "Settings", href: "/settings", icon: Settings },
    ...(isAdmin
      ? [{ label: "Admin", href: "/dashboard/admin", icon: Shield }]
      : []),
  ];
}

export const CARD_STYLES = "rounded-[20px] bg-[#D3D3D3] p-5" as const;

export const CARD_BUTTON_STYLES =
  "flex w-full items-center justify-between rounded-full bg-[#0F0F0F] px-5 py-3 text-sm font-semibold text-white cursor-pointer" as const;
