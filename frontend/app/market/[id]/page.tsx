"use client";

import { use } from "react";
import Link from "next/link";
import { useMarket } from "@/hooks/useMarket";
import { TradePanel } from "@/components/trading/TradePanel";
import { SharesDisplay } from "@/components/trading/SharesDisplay";
import { ClaimPanel } from "@/components/trading/ClaimPanel";
import { MarketStatus } from "@/components/markets/MarketStatus";
import { PriceChart } from "@/components/markets/PriceChart";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatUsdc, formatTimeLeft, formatSharePrice } from "@/lib/formatting";

export default function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const marketId = BigInt(id);
  const { data, isLoading, error, refetch } = useMarket(marketId);

  if (isLoading && !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Skeleton className="h-4 w-24 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-52 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    // Distinguish RPC failure from a truly missing market: the contract returns
    // an empty MarketInfo for unknown IDs (market.id === 0n) instead of reverting.
    const isRpcError = !!error;
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <p className="text-no text-lg">
          {isRpcError ? "Failed to load market" : "Market not found"}
        </p>
        {isRpcError && (
          <>
            <p className="text-sm text-text-muted mt-1">
              RPC request failed — check your connection.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 rounded-lg bg-surface-card border border-border text-sm text-text-primary hover:bg-navy-800 transition-colors"
            >
              Retry
            </button>
          </>
        )}
        <Link href="/" className="text-text-secondary text-sm underline mt-4 block">← Back to markets</Link>
      </div>
    );
  }

  const { market, pool, yesProbability, liquidity, volume } = data;
  const yesPct = (yesProbability * 100).toFixed(1);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/" className="text-text-muted hover:text-text-secondary text-sm mb-6 block transition-colors">
        ← All markets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-text-muted uppercase tracking-wide">{market.category}</span>
              <MarketStatus market={market} />
            </div>
            <h1 className="text-xl font-bold text-text-primary leading-snug">{market.question}</h1>
          </div>

          <div className="bg-surface-card border border-border rounded-xl p-5">
            <div className="flex justify-between mb-1">
              <div>
                <span className="text-yes font-bold text-2xl">{formatSharePrice(yesProbability)}</span>
                <span className="text-yes text-sm ml-2">YES</span>
                <p className="text-text-muted text-xs mt-0.5">{yesPct}% probability</p>
              </div>
              <div className="text-right">
                <span className="text-no font-bold text-2xl">{formatSharePrice(1 - yesProbability)}</span>
                <span className="text-no text-sm ml-2">NO</span>
                <p className="text-text-muted text-xs mt-0.5">{(100 - yesProbability * 100).toFixed(1)}% probability</p>
              </div>
            </div>
            <div className="h-3 bg-navy-800 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-brand transition-all duration-700 rounded-full"
                style={{ width: `${yesPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-3 text-xs text-text-muted">
              <span>Liquidity: {formatUsdc(liquidity)} mUSDC</span>
              <span>Volume: {formatUsdc(volume)} mUSDC</span>
            </div>
          </div>

          <div className="bg-surface-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
              YES Probability History
            </h3>
            <PriceChart marketId={marketId} />
          </div>

          <div className="bg-surface-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted text-xs mb-0.5">Closes in</p>
                <p className="text-text-primary font-medium">{formatTimeLeft(market.closingTime)}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs mb-0.5">Market ID</p>
                <p className="text-text-primary font-medium">#{market.id.toString()}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs mb-0.5">Trading fee</p>
                <p className="text-text-primary font-medium">2%</p>
              </div>
              <div>
                <p className="text-text-muted text-xs mb-0.5">Total collateral</p>
                <p className="text-text-primary font-medium">{formatUsdc(pool.totalCollateral)} mUSDC</p>
              </div>
            </div>
          </div>

          <SharesDisplay market={market} />
          <ActivityFeed marketId={marketId} limit={20} />
        </div>

        <div>
          {market.resolved
            ? <ClaimPanel market={market} />
            : <TradePanel data={data} />
          }
        </div>
      </div>
    </div>
  );
}
