"use client";

import { QueryClient } from "@tanstack/react-query";
import {
  PersistQueryClientProvider,
  type Persister,
} from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { NOTIFICATIONS_QUERY_ROOT } from "@/features/shared/notifications/hooks/notificationKeys";
import { ToastProvider } from "@/providers/ToastProvider";
import { useCurrencyStore } from "@/stores/currency.store";
import { ReactNode, useEffect, useState } from "react";

// Bumping this evicts ALL persisted cache for users on next load. Bump when
// query shapes change in incompatible ways or to force a hard refresh.
const CACHE_BUSTER = "v1";

// Used server-side where localStorage is unavailable. PersistQueryClientProvider
// initialises isRestoring:true on both server and client, so queries start in
// loading state on both sides — ensuring hydration consistency.
const noopPersister: Persister = {
  persistClient: async () => {},
  restoreClient: async () => undefined,
  removeClient: async () => {},
};

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000, // 1 min global default
            gcTime: 24 * 60 * 60_000, // 24h — must be >= persister maxAge
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [persister] = useState<Persister>(() =>
    typeof window === "undefined"
      ? noopPersister
      : createSyncStoragePersister({
          storage: window.localStorage,
          key: "neko-tanstack-cache",
          throttleTime: 1000,
        })
  );

  useEffect(() => {
    void useCurrencyStore.persist.rehydrate();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60_000, // 24h persisted
        buster: CACHE_BUSTER,
        dehydrateOptions: {
          // Only persist successful queries — avoid replaying errors on restore.
          // Notifications are excluded outright: an unread badge restored from
          // localStorage would show last session's count, and a stale "3" is
          // worse than an empty bell for the second it takes to fetch.
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" &&
            query.state.data !== undefined &&
            query.queryKey[0] !== NOTIFICATIONS_QUERY_ROOT,
        },
      }}
    >
      <ToastProvider>{children}</ToastProvider>
    </PersistQueryClientProvider>
  );
}
