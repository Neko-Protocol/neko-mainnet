import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/useToast";

const DEFAULT_RESET_MS = 1500;

export function useCopyToClipboard(options?: {
  resetMs?: number;
  showNotification?: boolean;
}) {
  const { resetMs = DEFAULT_RESET_MS, showNotification = false } =
    options ?? {};
  const t = useTranslations("sharedSettings.clipboard");
  const { addNotification } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = useCallback(
    (key: string, value: string) => {
      void navigator.clipboard.writeText(value).then(() => {
        setCopiedKey(key);
        if (showNotification) {
          addNotification(t("copiedToast"), "success");
        }
        if (resetMs > 0) {
          setTimeout(() => setCopiedKey(null), resetMs);
        }
      });
    },
    [resetMs, showNotification, addNotification, t]
  );

  return { copy, copiedKey } as const;
}
