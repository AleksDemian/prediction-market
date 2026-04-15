"use client";

import { useReadContract } from "wagmi";
import { predictionMarketConfig } from "@/lib/contracts";
import type { MarketInfo, MarketWithPool, Pool } from "@/types/market";
import { probToFloat } from "@/lib/formatting";

export function useMarkets() {
  const { data, isLoading, error, refetch } = useReadContract({
    ...predictionMarketConfig,
    functionName: "getAllMarkets",
    query: {
      refetchInterval: 15_000,
      staleTime: 10_000,
    },
  });

  const markets: MarketWithPool[] = [];
  if (data) {
    const [mArr, pArr] = data as [MarketInfo[], Pool[]];
    for (let i = 0; i < mArr.length; i++) {
      const pool = pArr[i];
      const total = pool.yesReserve + pool.noReserve;
      const yesProbability =
        total === 0n ? 0.5 : probToFloat((pool.noReserve * BigInt(1e18)) / total);
      markets.push({ market: mArr[i], pool, yesProbability });
    }
  }

  return { markets, isLoading, error, refetch };
}
