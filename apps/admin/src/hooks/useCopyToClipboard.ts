import { useCallback, useState } from "react";

const DEFAULT_RESET_MS = 1500;

export function useCopyToClipboard(options?: { resetMs?: number }) {
  const { resetMs = DEFAULT_RESET_MS } = options ?? {};
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = useCallback(
    (key: string, value: string) => {
      void navigator.clipboard.writeText(value).then(() => {
        setCopiedKey(key);
        if (resetMs > 0) {
          setTimeout(() => setCopiedKey(null), resetMs);
        }
      });
    },
    [resetMs]
  );

  return { copy, copiedKey } as const;
}
