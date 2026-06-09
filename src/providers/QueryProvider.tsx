"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactNode, useMemo, useState } from "react";
import { createQueryClient } from "@/lib/queryClient";
import { buildQueryPersister, queryPersistOptions } from "@/lib/queryPersister";

// Mirror of the persistence wiring in `app/providers.tsx`. See that file for
// the full rationale. Kept in sync because both providers wrap the
// QueryClient, and we want the LS-backed cache to "just work" no matter
// which one ends up in the tree.
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const persister = useMemo(() => buildQueryPersister(), []);

  if (persister) {
    return (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={queryPersistOptions(persister)}
      >
        {children}
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </PersistQueryClientProvider>
    );
  }

  // SSR fallback.
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
