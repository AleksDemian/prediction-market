"use client";

import { useActivityFeed } from "@/hooks/useActivityFeed";
import { ActivityItem } from "./ActivityItem";
import type { MarketWithPool } from "@/types/market";

interface ActivityFeedProps {
  marketId?: bigint;
  markets?: MarketWithPool[];
  limit?: number;
  title?: string;
}

export function ActivityFeed({ marketId, markets, limit = 20, title = "Recent Activity" }: ActivityFeedProps) {
  const { data: events, isLoading } = useActivityFeed({ marketId, limit });

  const questionMap = new Map<string, string>();
  if (markets) {
    for (const m of markets) {
      questionMap.set(m.market.id.toString(), m.market.question);
    }
  }

  return (
    <div className="bg-surface-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
        {title}
      </h3>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-navy-800 rounded animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (!events || events.length === 0) && (
        <p className="text-text-muted text-sm text-center py-6">No activity yet</p>
      )}

      {!isLoading && events && events.length > 0 && (
        <div>
          {events.map((event) => (
            <ActivityItem
              key={`${event.type}-${event.blockNumber.toString()}-${event.marketId.toString()}-${event.txHash ?? "no-tx"}`}
              event={event}
              showMarketQuestion={!marketId}
              question={questionMap.get(event.marketId.toString())}
            />
          ))}
        </div>
      )}
    </div>
  );
}
