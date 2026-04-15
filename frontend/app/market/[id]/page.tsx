"use client";

import { use } from "react";
import Link from "next/link";
import { useMarket } from "@/hooks/useMarket";
import { TradePanel } from "@/components/trading/TradePanel";
import { SharesDisplay } from "@/components/trading/SharesDisplay";
import { ClaimPanel } from "@/components/trading/ClaimPanel";
import { MarketStatus } from "@/components/markets/MarketStatus";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatUsdc, formatTimeLeft } from "@/lib/formatting";

export default function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const marketId = BigInt(id);
  const { data, isLoading, error } = useMarket(marketId);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Skeleton className="h-4 w-24 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <p className="text-no text-lg">Market not found</p>
        <Link href="/" className="text-accent text-sm underline mt-2 block">← Back to markets</Link>
      </div>
    );
  }

  const { market, pool, yesProbability } = data;
  const yesPct = (yesProbability * 100).toFixed(1);
  const noPct  = (100 - yesProbability * 100).toFixed(1);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Link href="/" className="text-accent-dim hover:text-accent text-sm mb-6 block">
        ← All markets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: market info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-accent-dim uppercase tracking-wide">{market.category}</span>
              <MarketStatus market={market} />
            </div>
            <h1 className="text-xl font-bold text-white leading-snug">{market.question}</h1>
          </div>

          {/* Probability */}
          <div className="bg-surface-card border border-accent-dim/20 rounded-xl p-5">
            <div className="flex justify-between mb-2">
              <span className="text-yes font-bold text-lg">{yesPct}% YES</span>
              <span className="text-no  font-bold text-lg">{noPct}% NO</span>
            </div>
            <div className="h-3 bg-navy rounded-full overflow-hidden">
              <div
                className="h-full bg-yes transition-all duration-700 rounded-full"
                style={{ width: `${yesPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-3 text-xs text-accent-dim">
              <span>Liquidity: {formatUsdc(pool.yesReserve + pool.noReserve)} mUSDC</span>
              <span>Volume: {formatUsdc(pool.totalCollateral)} mUSDC</span>
            </div>
          </div>

          {/* Details */}
          <div className="bg-surface-card border border-accent-dim/20 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-accent-dim mb-3 uppercase tracking-wide">Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-accent-dim text-xs mb-0.5">Closes in</p>
                <p className="text-white font-medium">{formatTimeLeft(market.closingTime)}</p>
              </div>
              <div>
                <p className="text-accent-dim text-xs mb-0.5">Market ID</p>
                <p className="text-white font-medium">#{market.id.toString()}</p>
              </div>
              <div>
                <p className="text-accent-dim text-xs mb-0.5">Trading fee</p>
                <p className="text-white font-medium">2%</p>
              </div>
              <div>
                <p className="text-accent-dim text-xs mb-0.5">Total collateral</p>
                <p className="text-white font-medium">{formatUsdc(pool.totalCollateral)} mUSDC</p>
              </div>
            </div>
          </div>

          {/* Position + Claim */}
          <SharesDisplay market={market} />
          <ClaimPanel market={market} />
        </div>

        {/* Right: trade panel */}
        <div>
          <TradePanel data={data} />
        </div>
      </div>
    </div>
  );
}
