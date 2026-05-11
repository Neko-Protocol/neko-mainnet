"use client";

import { useCallback } from "react";
import { useWebHaptics } from "web-haptics/react";

function runTrigger(
  trigger: ReturnType<typeof useWebHaptics>["trigger"],
  ...args: Parameters<ReturnType<typeof useWebHaptics>["trigger"]>
): void {
  try {
    const result = trigger(...args);
    if (result instanceof Promise) {
      void result.catch(() => {});
    }
  } catch {
    // Missing or unsupported Vibration API, or web-haptics errors — never surface to callers.
  }
}

export function useHaptics(): {
  light: () => void;
  success: () => void;
  error: () => void;
} {
  const { trigger } = useWebHaptics();

  const light = useCallback(() => {
    runTrigger(trigger, 40);
  }, [trigger]);

  const success = useCallback(() => {
    runTrigger(trigger, "success");
  }, [trigger]);

  const error = useCallback(() => {
    runTrigger(trigger, "error");
  }, [trigger]);

  return { light, success, error };
}
