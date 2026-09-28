"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { ErrorCode } from "@neko-protocol/api-contracts";

const KNOWN_CODES = new Set<string>(Object.values(ErrorCode));

/**
 * Translates a backend/contract `code` (see packages/api-contracts/src/errors.ts)
 * into localized UI copy. Unrecognized or missing codes fall back to a
 * generic localized message — never the raw English error text — so a
 * backend error can never leak untranslated into the UI. The returned
 * function is stable (wraps next-intl's memoized `t`), safe to use inside
 * useCallback dependency arrays.
 */
export function useApiErrorMessage() {
  const t = useTranslations("errors");

  return useCallback(
    (code?: string | null): string => {
      if (code && KNOWN_CODES.has(code)) {
        return t(`codes.${code}`);
      }
      return t("generic");
    },
    [t]
  );
}
