"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider, keepPreviousData } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/lib/wagmi";
import { ToastProvider } from "@/components/ui/Toast";
import { Header } from "@/components/layout/Header";
import { useMarketSyncListener } from "@/hooks/useMarketSync";

import "@rainbow-me/rainbowkit/styles.css";

function MarketSyncListener() {
  useMarketSyncListener();
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 30s — prevents redundant refetches when navigating
      // between pages or when multiple components subscribe to the same query.
      staleTime: 30_000,
      // Viem's fallback transport already retries on transient RPC errors (429, 5xx,
      // timeouts) and falls through to backup endpoints. Keep react-query's own retry
      // off to avoid stacking waits on top of that.
      retry: false,
      // Preserve the last successful result while a refetch is in-flight or errors.
      // UI can still read `error` to show a subtle indicator, but won't flash empty.
      placeholderData: keepPreviousData,
      // Avoid burst of refetches when the user tabs back — our refetchInterval is enough.
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          locale="en-US"
          theme={darkTheme({
            accentColor: "#cfd4db",
            accentColorForeground: "#0d1b2a",
            borderRadius: "medium",
            overlayBlur: "small",
          })}
        >
          <ToastProvider>
            <MarketSyncListener />
            <Header />
            <main className="flex-1">{children}</main>
          </ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
