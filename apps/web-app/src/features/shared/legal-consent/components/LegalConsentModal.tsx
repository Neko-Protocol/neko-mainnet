"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useStellarWalletStore } from "@/stores/stellarWalletStore";
import { usersService } from "@/lib/services/users.service";
import {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
} from "@/lib/constants/legal";
import { useLegalConsentStore } from "../stores/legal-consent.store";

export function LegalConsentModal() {
  const t = useTranslations("common.legalConsent");
  const address = useStellarWalletStore((s) => s.address);
  const setStatus = useLegalConsentStore((s) => s.setStatus);

  const [checked, setChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);

  async function handleAccept() {
    if (!address || !checked || isSubmitting) return;
    setIsSubmitting(true);
    setError(false);
    const result = await usersService.acceptLegal(
      address,
      CURRENT_TERMS_VERSION,
      CURRENT_PRIVACY_VERSION
    );
    if (result.ok) {
      setStatus("accepted");
    } else {
      setIsSubmitting(false);
      setError(true);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#161616] p-6 shadow-2xl">
        <p className="mb-1 text-base font-semibold text-white">{t("title")}</p>
        <p className="mb-5 text-sm leading-relaxed text-white/50">
          {t("body")}
        </p>

        <label className="flex cursor-pointer select-none items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/25 bg-transparent"
          />
          <span className="text-sm leading-relaxed text-white/70">
            {t.rich("checkboxLabel", {
              privacy: (chunks) => (
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-neko-accent"
                >
                  {chunks}
                </Link>
              ),
              terms: (chunks) => (
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-neko-accent"
                >
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>

        {error && <p className="mt-3 text-xs text-red-400">{t("error")}</p>}

        <button
          type="button"
          disabled={!checked || isSubmitting}
          onClick={handleAccept}
          className="mt-5 w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? t("submitting") : t("accept")}
        </button>
      </div>
    </div>
  );
}
