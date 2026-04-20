"use client";

import { MarketCard } from "./MarketCard";
import { MarketCardSkeleton } from "@/components/ui/Skeleton";
import type { MarketWithPool } from "@/types/market";

interface MarketListProps {
  markets: MarketWithPool[];
  isLoading: boolean;
  error?: Error | null;
  emptyMessage?: string;
  onRetry?: () => void;
}

export function MarketList({ markets, isLoading, error, emptyMessage, onRetry }: MarketListProps) {
  if (isLoading && markets.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <MarketCardSkeleton key={i} />)}
      </div>
    );
  }

  // Only treat error as fatal when we have nothing cached to show.
  // With `placeholderData: keepPreviousData` the previous successful payload is
  // still available during a failed refetch, so we prefer showing stale data.
  if (error && markets.length === 0) {
    return (
      <div className="text-center py-16 text-no">
        <p className="text-lg font-medium">Failed to load markets</p>
        <p className="text-sm text-text-muted mt-1">Check your RPC connection and contract address</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 px-4 py-2 rounded-lg bg-surface-card border border-border text-sm text-text-primary hover:bg-navy-800 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-16 text-text-muted">
        <p className="text-lg">{emptyMessage ?? "No markets found"}</p>
        {!emptyMessage && (
          <p className="text-sm mt-1">Run the seed script to create demo markets</p>
        )}
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-border bg-surface-card px-3 py-2 text-xs text-text-muted flex items-center justify-between">
          <span>Network hiccup — showing cached data.</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-text-secondary hover:text-text-primary underline"
            >
              Retry
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {markets.map((m) => (
          <MarketCard key={m.market.id.toString()} data={m} />
        ))}
      </div>
    </>
  );
}
