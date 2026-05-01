"use client";

import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

const CHANNEL = "prediction-market-sync";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function broadcastMarketsUpdated() {
  if (typeof BroadcastChannel === "undefined") return;
  const ch = new BroadcastChannel(CHANNEL);
  ch.postMessage({ type: "markets_updated" });
  ch.close();
}

// After an admin transaction confirms, refresh the indexer once then poll the
// local API until the indexed data appears (same pattern as useTrading.pollAfterTrade).
// Broadcasts to other tabs after the first poll so they also refetch.
export function usePollAfterAdminTx() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    (async () => {
      try {
        await fetch("/api/indexer/refresh", { method: "POST" });
      } catch {
        // Scheduled background poll will catch up if this fails.
      }
      const attempts = 15;
      for (let i = 0; i < attempts; i++) {
        await sleep(2_000);
        queryClient.invalidateQueries({ queryKey: ["markets"] });
        if (i === 0) broadcastMarketsUpdated();
      }
    })();
  }, [queryClient]);
}

// Mounted once globally (in Providers). Listens for cross-tab admin transactions
// and refetches a few times to catch indexed data without extra RPC calls.
export function useMarketSyncListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = () => {
      for (let i = 0; i < 5; i++) {
        setTimeout(
          () => queryClient.invalidateQueries({ queryKey: ["markets"] }),
          i * 2_000
        );
      }
    };

    return () => ch.close();
  }, [queryClient]);
}
