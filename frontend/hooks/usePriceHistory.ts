"use client";

import { useQuery } from "@tanstack/react-query";
import type { PriceRow } from "@/lib/queries";

export interface PricePoint {
  timestamp: number;
  probability: number;
  blockNumber: bigint;
}

export function usePriceHistory(marketId: bigint) {
  return useQuery({
    queryKey: ["priceHistory", marketId.toString()],
    queryFn: async (): Promise<PricePoint[]> => {
      const res = await fetch(`/api/markets/${marketId}/prices`);
      if (!res.ok) throw new Error(`prices fetch failed: ${res.status}`);
      const rows: PriceRow[] = await res.json();
      return rows.map((r) => ({
        timestamp: r.timestamp,
        probability: r.probability,
        blockNumber: BigInt(r.block_number),
      }));
    },
    enabled: marketId > 0n,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    // Baseline polling is low-frequency; write flow triggers a short 2s burst
    // via query invalidation in useTrading.pollAfterTrade().
    refetchInterval: 120_000,
  });
}
