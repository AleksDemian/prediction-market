import Link from "next/link";
import { MarketStatus } from "./MarketStatus";
import type { MarketWithPool } from "@/types/market";
import { formatUsdc, formatTimeLeft } from "@/lib/formatting";

interface MarketCardProps {
  data: MarketWithPool;
}

export function MarketCard({ data }: MarketCardProps) {
  const { market, pool, yesProbability } = data;
  const yesPct = (yesProbability * 100).toFixed(1);
  const noPct  = (100 - yesProbability * 100).toFixed(1);

  return (
    <Link
      href={`/market/${market.id.toString()}`}
      className="block bg-surface-card border border-accent-dim/20 rounded-xl p-5 hover:border-accent/40 transition-colors group"
    >
      {/* Header row */}
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs text-accent-dim uppercase tracking-wide">{market.category}</span>
        <MarketStatus market={market} />
      </div>

      {/* Question */}
      <h3 className="text-white font-medium text-sm leading-snug mb-4 group-hover:text-accent transition-colors line-clamp-2">
        {market.question}
      </h3>

      {/* Probability bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-yes font-medium">YES {yesPct}%</span>
          <span className="text-no  font-medium">NO  {noPct}%</span>
        </div>
        <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-yes rounded-full transition-all duration-500"
            style={{ width: `${yesPct}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between text-xs text-accent-dim">
        <span>Vol: {formatUsdc(pool.totalCollateral)} mUSDC</span>
        <span>Closes: {formatTimeLeft(market.closingTime)}</span>
      </div>
    </Link>
  );
}
