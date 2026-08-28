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
): { labelKey: string; href: string; icon: React.ElementType }[] {
  return [
    { labelKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
    { labelKey: "discover", href: "/discover", icon: BarChart2 },
    { labelKey: "pools", href: "/pools", icon: Landmark },
    ...(mode !== "basic"
      ? [{ labelKey: "swap", href: "/swap", icon: ArrowLeftRight }]
      : [{ labelKey: "cart", href: "/cart", icon: ShoppingCart }]),
    { labelKey: "vault", href: "/vaults", icon: Vault },
    { labelKey: "strategies", href: "/strategies", icon: Layers },
    { labelKey: "settings", href: "/settings", icon: Settings },
    ...(isAdmin
      ? [{ labelKey: "admin", href: "/dashboard/admin", icon: Shield }]
      : []),
  ];
}

export const CARD_STYLES = "rounded-[20px] bg-[#D3D3D3] p-5" as const;

export const CARD_BUTTON_STYLES =
  "flex w-full items-center justify-between rounded-full bg-[#0F0F0F] px-5 py-3 text-sm font-semibold text-white cursor-pointer" as const;
