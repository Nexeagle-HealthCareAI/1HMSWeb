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
import { useAppStore } from "@/store/appStore";
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
  const { isLowBandwidthMode, setLowBandwidthMode } = useAppStore();

  // Boot the offline subsystem (connectivity heartbeat, sync engine, SW, persistent storage).
  useEffect(() => { initOffline(queryClient); }, []);

  // Initialize and listen to low bandwidth mode from network API
  useEffect(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      const updateBandwidth = () => {
        if (connection.saveData || ['slow-2g', '2g', '3g'].includes(connection.effectiveType)) {
          setLowBandwidthMode(true);
        } else {
          setLowBandwidthMode(false);
        }
      };
      
      // Only auto-set on mount if not already persisted (or maybe we just always auto-detect unless manually overridden later, but for simplicity let's auto-detect on mount)
      updateBandwidth();
      
      connection.addEventListener('change', updateBandwidth);
      return () => connection.removeEventListener('change', updateBandwidth);
    }
  }, [setLowBandwidthMode]);

  // Dynamically update QueryClient defaults based on bandwidth mode
  useEffect(() => {
    queryClient.setDefaultOptions({
      queries: {
        staleTime: isLowBandwidthMode ? 15 * 60 * 1000 : 5 * 60 * 1000, // 15 mins for low bandwidth, else 5 mins
        gcTime: 24 * 60 * 60 * 1000, 
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: !isLowBandwidthMode, // disable refetch on reconnect if low bandwidth
      },
    });
  }, [isLowBandwidthMode]);

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
