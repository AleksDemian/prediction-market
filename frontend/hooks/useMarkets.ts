"use client";

import { useReadContract } from "wagmi";
import { predictionMarketConfig } from "@/lib/contracts";
import type { MarketInfo, MarketWithPool, Pool } from "@/types/market";
import { probToFloat } from "@/lib/formatting";
import { useMarketVolumes } from "@/hooks/useMarketVolumes";

export function useMarkets() {
  const { data: volumeData } = useMarketVolumes();
  const { data, isLoading, error, refetch } = useReadContract({
    ...predictionMarketConfig,
    functionName: "getAllMarkets",
    query: {
      refetchInterval: 30_000,
      staleTime: 20_000,
    },
  });

  const markets: MarketWithPool[] = [];
  if (data) {
    const [mArr, pArr] = data as [MarketInfo[], Pool[]];
    for (let i = 0; i < mArr.length; i++) {
      const pool = pArr[i];
      const market = mArr[i];
      const total = pool.yesReserve + pool.noReserve;
      const yesProbability =
        total === 0n ? 0.5 : probToFloat((pool.noReserve * BigInt(1e18)) / total);
      const liquidity = pool.totalCollateral;
      const volume = volumeData?.volumesByMarket.get(market.id.toString()) ?? 0n;
      markets.push({ market, pool, yesProbability, liquidity, volume });
    }
  }

  return { markets, isLoading, error, refetch };
}
