import type { Metadata } from "next";
import { CarPage } from "@/features/basic/car";

export const metadata: Metadata = {
  title: "Car | Neko Protocol",
  description: "Review and confirm your pending asset purchases.",
};

export default function CarRoute() {
  return <CarPage />;
}
