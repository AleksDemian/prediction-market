"use client";

import { useMarkets } from "@/hooks/useMarkets";
import { useMarketFilters } from "@/hooks/useMarketFilters";
import { MarketList } from "@/components/markets/MarketList";
import { MarketFilters } from "@/components/markets/MarketFilters";
import type { MarketRow } from "@/lib/queries";

interface Props {
  initialMarkets?: MarketRow[];
}

export default function MarketsClientPage({ initialMarkets }: Props) {
  const { markets, isLoading, error, refetch } = useMarkets(initialMarkets);
  const { filters, setFilters, filteredMarkets, categories, resetFilters } =
    useMarketFilters(markets);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-1">
          Prediction Markets
        </h1>
        <p className="text-text-secondary text-sm">
          Trade YES/NO shares on real-world outcomes · Powered by
          constant-product AMM · Sepolia testnet
        </p>
      </div>

      {!isLoading && !error && (
        <MarketFilters
          filters={filters}
          onChange={setFilters}
          categories={categories}
          resultCount={filteredMarkets.length}
          onReset={resetFilters}
        />
      )}

      <MarketList
        markets={filteredMarkets}
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
        emptyMessage={
          filters.search ||
          filters.category !== "all" ||
          filters.status !== "all"
            ? "No markets match your filters."
            : undefined
        }
      />
    </div>
  );
}
