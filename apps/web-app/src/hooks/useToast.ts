import { notify, promise, action, sileo } from "@/lib/toast";

/**
 * Returns notify/action/promise/dismiss/clear directly (no wrapping arrow
 * functions) so every consumer gets the same stable reference on every
 * render. A previous version wrapped notify in a new closure each call,
 * which made addNotification a fresh identity every render, and any
 * useEffect depending on it (several referral hooks do) would re-run on
 * unrelated re-renders instead of only when something it actually cares
 * about changed.
 */
export function useToast() {
  return {
    addNotification: notify,
    action,
    promise,
    dismiss: sileo.dismiss,
    clear: sileo.clear,
  };
}
