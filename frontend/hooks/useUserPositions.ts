"use client";

import { useAccount, useReadContract } from "wagmi";
import { predictionMarketConfig } from "@/lib/contracts";
import type { Position } from "@/types/market";

export function useUserPosition(marketId: bigint) {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    ...predictionMarketConfig,
    functionName: "getUserPosition",
    args: [marketId, address!],
    query: {
      enabled: !!address && marketId > 0n,
      refetchInterval: 120_000,
      staleTime: 60_000,
    },
  });

  return {
    position: data as Position | undefined,
    isLoading,
    refetch,
  };
}
