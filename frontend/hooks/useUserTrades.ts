"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

export interface MarketTradeStats {
  avgYesEntry: number;
  avgNoEntry: number;
  totalYesCost: number;
  totalNoCost: number;
}

export type UserTradeStats = Record<string, MarketTradeStats>;

export function useUserTrades() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ["userTrades", address],
    queryFn: async (): Promise<UserTradeStats> => {
      if (!address) return {};
      const res = await fetch(`/api/portfolio/${address}`);
      if (!res.ok) throw new Error(`portfolio fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: !!address,
    staleTime: 30_000,
    refetchOnMount: true,
    refetchInterval: 30_000,
  });
}
