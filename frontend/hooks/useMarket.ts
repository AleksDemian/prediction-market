"use client";

import { useReadContract } from "wagmi";
import { predictionMarketConfig } from "@/lib/contracts";
import type { MarketInfo, MarketWithPool, Pool } from "@/types/market";
import { probToFloat } from "@/lib/formatting";
import { useMarketVolumes } from "@/hooks/useMarketVolumes";

export function useMarket(marketId: bigint) {
  const { data: volumeData } = useMarketVolumes();
  const { data, isLoading, error, refetch } = useReadContract({
    ...predictionMarketConfig,
    functionName: "getMarket",
    args: [marketId],
    query: {
      enabled: marketId > 0n,
      refetchInterval: 30_000,
      staleTime: 20_000,
    },
  });

  let result: MarketWithPool | undefined;
  if (data) {
    const [market, pool] = data as [MarketInfo, Pool];
    const total = pool.yesReserve + pool.noReserve;
    const yesProbability =
      total === 0n ? 0.5 : probToFloat((pool.noReserve * BigInt(1e18)) / total);
    const liquidity = pool.totalCollateral;
    const volume = volumeData?.volumesByMarket.get(market.id.toString()) ?? 0n;
    result = { market, pool, yesProbability, liquidity, volume };
  }

  return { data: result, isLoading, error, refetch };
}
