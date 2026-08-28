import type { Metadata } from "next";
import type { ReactNode } from "react";
import { QueryProvider } from "@/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neko Admin",
  description: "Internal console for Neko",
};

// Browser extensions (MetaMask, etc.) inject scripts into every page and can
// throw uncaught errors (e.g. "Failed to connect to MetaMask") that have
// nothing to do with this app. Next's dev overlay surfaces any uncaught
// window error/rejection, so we intercept and silence ones whose stack
// points at an extension origin before that overlay's own listener runs.
const SUPPRESS_EXTENSION_ERRORS_SCRIPT = `(function () {
  function isFromExtension(value) {
    return typeof value === "string" && /-extension:\\/\\//.test(value);
  }
  window.addEventListener("error", function (event) {
    if (isFromExtension(event.filename) || isFromExtension(event.message)) {
      event.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener("unhandledrejection", function (event) {
    var stack = event.reason && event.reason.stack;
    if (isFromExtension(stack)) {
      event.stopImmediatePropagation();
    }
  }, true);
})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: SUPPRESS_EXTENSION_ERRORS_SCRIPT }}
        />
      </head>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
