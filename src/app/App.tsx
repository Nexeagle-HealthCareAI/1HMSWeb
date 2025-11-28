import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { StoreProvider } from "@/store";
import { InactivityProvider } from "@/components/providers/InactivityProvider";
import { AppRoutes } from "./AppRoutes";
import { Toaster as SonnerToaster } from 'sonner';
import '@/i18n'; // Initialize i18n

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <StoreProvider>
      <BrowserRouter>
        <InactivityProvider>
          <TooltipProvider>
            <Toaster />
            <SonnerToaster />
            <AppRoutes />
          </TooltipProvider>
        </InactivityProvider>
      </BrowserRouter>
    </StoreProvider>
  </QueryClientProvider>
);

export default App;
