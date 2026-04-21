"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketWithPool } from "@/types/market";
import type { MarketRow } from "@/lib/queries";
import { probToFloat } from "@/lib/formatting";

export function parseMarketRow(row: MarketRow): MarketWithPool {
  const yesReserve = BigInt(row.yes_reserve ?? 0);
  const noReserve = BigInt(row.no_reserve ?? 0);
  const totalCollateral = BigInt(row.total_collateral ?? 0);
  const total = yesReserve + noReserve;
  const yesProbability =
    total === 0n
      ? 0.5
      : probToFloat((noReserve * BigInt(1e18)) / total);

  return {
    market: {
      id: BigInt(row.id),
      question: row.question,
      category: row.category,
      closingTime: BigInt(row.closing_time),
      resolutionTime: BigInt(row.resolution_time),
      outcome: row.outcome,
      creator: row.creator as `0x${string}`,
      resolved: Boolean(row.resolved),
    },
    pool: {
      yesReserve,
      noReserve,
      totalCollateral,
      lpFeeAccrued: 0n,
    },
    yesProbability,
    liquidity: totalCollateral,
    volume: BigInt(Math.round(row.volume)),
  };
}

export function useMarkets(initialData?: MarketRow[]) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["markets"],
    queryFn: async (): Promise<MarketWithPool[]> => {
      const res = await fetch("/api/markets");
      if (!res.ok) throw new Error(`/api/markets ${res.status}`);
      const rows: MarketRow[] = await res.json();
      return rows.map(parseMarketRow);
    },
    initialData: initialData?.map(parseMarketRow),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  return { markets: data ?? [], isLoading, error, refetch };
}
