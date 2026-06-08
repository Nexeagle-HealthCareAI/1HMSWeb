import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { BrowserRouter } from "react-router-dom";
import { StoreProvider } from "@/store";
import { InactivityProvider } from "@/components/providers/InactivityProvider";
import { AppRoutes } from "./AppRoutes";
import { Toaster as SonnerToaster } from 'sonner';
import { initOffline, offlinePersister, PERSIST_BUSTER, PERSIST_MAX_AGE } from "@/offline";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import '@/i18n'; // Initialize i18n

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24h — keep cached for offline restore
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

const App = () => {
  // Boot the offline subsystem (connectivity heartbeat, sync engine, SW, persistent storage).
  useEffect(() => { initOffline(queryClient); }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: offlinePersister, maxAge: PERSIST_MAX_AGE, buster: PERSIST_BUSTER }}
    >
      <StoreProvider>
        <BrowserRouter>
          <InactivityProvider>
            <TooltipProvider>
              <Toaster />
              <SonnerToaster />
              <OfflineBanner />
              <AppRoutes />
            </TooltipProvider>
          </InactivityProvider>
        </BrowserRouter>
      </StoreProvider>
    </PersistQueryClientProvider>
  );
};

export default App;
