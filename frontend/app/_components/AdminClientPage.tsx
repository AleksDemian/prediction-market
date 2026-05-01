"use client";

import { useMarkets } from "@/hooks/useMarkets";
import { ResolveMarketCard } from "@/components/admin/ResolveMarketCard";
import { CreateMarketCard } from "@/components/admin/CreateMarketCard";
import { Outcome } from "@/types/market";
import type { MarketWithPool } from "@/types/market";

function sortByResolutionTime(a: MarketWithPool, b: MarketWithPool) {
  return Number(a.market.resolutionTime - b.market.resolutionTime);
}

export default function AdminClientPage() {
  const { markets, isLoading, error } = useMarkets();

  const unresolved = markets
    .filter((m) => !m.market.resolved)
    .sort(sortByResolutionTime);

  const resolved = markets
    .filter((m) => m.market.resolved)
    .sort((a, b) => Number(b.market.resolutionTime - a.market.resolutionTime));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-1">Admin Panel</h1>
        <p className="text-text-secondary text-sm">
          Resolve any market with your connected wallet. Uses{" "}
          <code className="text-brand text-xs">forceResolveMarket</code> — no
          time restriction.
        </p>
      </div>

      <CreateMarketCard />

      {isLoading && (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-surface-card border border-border rounded-xl p-5 animate-pulse h-36"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-surface-card border border-border rounded-xl p-5 text-error text-sm">
          Failed to load markets: {error.message}
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Unresolved markets */}
          {unresolved.length > 0 && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                Unresolved ({unresolved.length})
              </h2>
              <div className="grid gap-3">
                {unresolved.map((data) => (
                  <ResolveMarketCard key={data.market.id.toString()} data={data} />
                ))}
              </div>
            </section>
          )}

          {unresolved.length === 0 && (
            <div className="bg-surface-card border border-border rounded-xl p-8 text-center mb-8">
              <p className="text-text-secondary text-sm">
                All markets are resolved.
              </p>
            </div>
          )}

          {/* Resolved markets */}
          {resolved.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                Resolved ({resolved.length})
              </h2>
              <div className="grid gap-2">
                {resolved.map((data) => (
                  <div
                    key={data.market.id.toString()}
                    className="bg-surface-card border border-border rounded-xl px-5 py-3 opacity-50 flex items-center justify-between gap-3"
                  >
                    <p className="text-text-secondary text-sm line-clamp-1 flex-1">
                      {data.market.question}
                    </p>
                    <span
                      className={
                        data.market.outcome === Outcome.YES
                          ? "text-xs text-yes font-medium"
                          : data.market.outcome === Outcome.NO
                          ? "text-xs text-no font-medium"
                          : "text-xs text-text-muted font-medium"
                      }
                    >
                      {data.market.outcome === Outcome.YES
                        ? "YES"
                        : data.market.outcome === Outcome.NO
                        ? "NO"
                        : "INVALID"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
