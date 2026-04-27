"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketWithPool } from "@/types/market";
import type { MarketRow } from "@/lib/queries";
import { parseMarketRow } from "./useMarkets";

export function useMarket(marketId: bigint, initialData?: MarketRow) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["market", marketId.toString()],
    queryFn: async (): Promise<MarketWithPool | null> => {
      const res = await fetch(`/api/markets/${marketId}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`/api/markets/${marketId} ${res.status}`);
      const row: MarketRow = await res.json();
      return parseMarketRow(row);
    },
    enabled: marketId > 0n,
    initialData: initialData ? parseMarketRow(initialData) : undefined,
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  return {
    data: data ?? undefined,
    isLoading,
    error,
    refetch,
  };
}
