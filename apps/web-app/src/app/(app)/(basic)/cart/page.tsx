import type { Metadata } from "next";
import { CartPage } from "@/features/basic/cart";

export const metadata: Metadata = {
  title: "Cart | Neko Protocol",
  description: "Review and confirm your pending asset purchases.",
};

export default function CartRoute() {
  return <CartPage />;
}
