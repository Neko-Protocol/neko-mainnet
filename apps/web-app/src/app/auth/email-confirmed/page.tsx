"use client";

import { useEffect, useRef } from "react";

import { backendClient } from "@/lib/services/backend-client";

function parseFragment(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return {};
  return Object.fromEntries(new URLSearchParams(hash));
}

export default function EmailConfirmedPage() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const redirect = (status: "verified" | "error") => {
      window.location.replace(`/settings?email=${status}`);
    };

    const search = new URLSearchParams(window.location.search);
    const wallet = search.get("wallet");
    const errorDescription =
      search.get("error_description") ?? search.get("error");
    if (errorDescription || !wallet) {
      redirect("error");
      return;
    }

    const fragment = parseFragment();
    const accessToken = fragment.access_token;
    if (!accessToken) {
      redirect("error");
      return;
    }

    void (async () => {
      try {
        await backendClient.post("/users/email/confirm", {
          wallet,
          access_token: accessToken,
        });
        redirect("verified");
      } catch {
        redirect("error");
      }
    })();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0F0F] px-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-lg font-semibold text-white/90">
          Verifying your email…
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Hang tight, this only takes a moment.
        </p>
      </div>
    </div>
  );
}
