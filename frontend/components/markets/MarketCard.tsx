import Link from "next/link";
import { clsx } from "clsx";
import type { MarketWithPool } from "@/types/market";
import { formatUsdc, formatTimeLeft, formatSharePrice } from "@/lib/formatting";

interface MarketCardProps {
  data: MarketWithPool;
}

const CATEGORY_COLORS: Record<string, string> = {
  Crypto:      "text-brand bg-brand-ghost",
  Sports:      "text-info bg-info/10",
  Technology:  "text-warning bg-warning/10",
  Finance:     "text-invalid bg-invalid/10",
  Demo:        "text-yes bg-yes-muted/20",
};

function CategoryBadge({ category }: { category: string }) {
  const cls = CATEGORY_COLORS[category] ?? "text-text-secondary bg-navy-800";
  return (
    <span className={clsx("text-xs px-2.5 py-0.5 rounded-full font-medium", cls)}>
      {category}
    </span>
  );
}

function StatusBadge({ data }: { data: MarketWithPool }) {
  const { market } = data;
  const now = BigInt(Math.floor(Date.now() / 1000));

  if (market.resolved) {
    return <span className="text-xs px-2.5 py-0.5 rounded-full font-medium text-info bg-info/10">Resolved</span>;
  }
  if (market.closingTime <= now) {
    return <span className="text-xs px-2.5 py-0.5 rounded-full font-medium text-text-muted bg-navy-800">Closed</span>;
  }
  const timeLeft = market.closingTime - now;
  if (timeLeft < 86400n) {
    return <span className="text-xs px-2.5 py-0.5 rounded-full font-medium text-warning bg-warning/10">Closing Soon</span>;
  }
  return <span className="text-xs px-2.5 py-0.5 rounded-full font-medium text-brand bg-brand-ghost">Open</span>;
}

export function MarketCard({ data }: MarketCardProps) {
  const { market, yesProbability, volume } = data;
  const yesPct = (yesProbability * 100).toFixed(1);

  return (
    <Link
      href={`/market/${market.id.toString()}`}
      className="block bg-surface-card border border-border rounded-xl p-5 hover:bg-surface-hover hover:border-border-light transition-colors group"
    >
      {/* Header row */}
      <div className="flex justify-between items-start mb-3 gap-2">
        <CategoryBadge category={market.category} />
        <StatusBadge data={data} />
      </div>

      {/* Question */}
      <h3 className="text-text-primary font-medium text-sm leading-snug mb-4 group-hover:text-brand transition-colors line-clamp-2">
        {market.question}
      </h3>

      {/* Price bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-yes font-semibold">YES {formatSharePrice(yesProbability)}</span>
          <span className="text-no  font-semibold">NO  {formatSharePrice(1 - yesProbability)}</span>
        </div>
        <div className="h-2 bg-navy-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-500"
            style={{ width: `${yesPct}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between text-xs text-text-muted">
        <span>Vol: {formatUsdc(volume)} mUSDC</span>
        <span>Closes: {formatTimeLeft(market.closingTime)}</span>
      </div>
    </Link>
  );
}
