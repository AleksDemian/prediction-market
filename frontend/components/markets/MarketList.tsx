"use client";

import { useMarkets } from "@/hooks/useMarkets";
import { MarketCard } from "./MarketCard";
import { MarketCardSkeleton } from "@/components/ui/Skeleton";

export function MarketList() {
  const { markets, isLoading, error } = useMarkets();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <MarketCardSkeleton key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-no">
        <p className="text-lg font-medium">Failed to load markets</p>
        <p className="text-sm text-accent-dim mt-1">Check your RPC connection and contract address</p>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-16 text-accent-dim">
        <p className="text-lg">No markets found</p>
        <p className="text-sm mt-1">Run the seed script to create demo markets</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {markets.map((m) => (
        <MarketCard key={m.market.id.toString()} data={m} />
      ))}
    </div>
  );
}
