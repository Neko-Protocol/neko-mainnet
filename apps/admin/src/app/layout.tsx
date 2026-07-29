import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { QueryProvider } from "@/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neko Admin",
  description: "Neko internal operations console",
};

export const viewport: Viewport = { themeColor: "#121212" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
