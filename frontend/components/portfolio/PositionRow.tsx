"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { useTrading } from "@/hooks/useTrading";
import { Button } from "@/components/ui/Button";
import { formatShares, formatSharePrice } from "@/lib/formatting";
import type { PortfolioPosition } from "@/hooks/usePortfolio";
import { Outcome } from "@/types/market";

interface PositionRowProps {
  position: PortfolioPosition;
  onTraded?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Crypto: "text-brand bg-brand-ghost",
  Sports: "text-info bg-info/10",
  Technology: "text-warning bg-warning/10",
  Finance: "text-invalid bg-invalid/10",
  Demo: "text-yes bg-yes-muted/20",
};

function StatusBadge({ status, outcome }: { status: PortfolioPosition["marketStatus"]; outcome: number }) {
  if (status === "resolved") {
    const labels: Record<number, { label: string; cls: string }> = {
      [Outcome.YES]:     { label: "Resolved YES", cls: "text-yes bg-yes-muted/30" },
      [Outcome.NO]:      { label: "Resolved NO",  cls: "text-no bg-no-muted/30" },
      [Outcome.INVALID]: { label: "Invalid",       cls: "text-invalid bg-invalid/10" },
    };
    const d = labels[outcome] ?? { label: "Resolved", cls: "text-text-muted bg-navy-800" };
    return <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", d.cls)}>{d.label}</span>;
  }
  if (status === "closed") {
    return <span className="text-xs px-2 py-0.5 rounded-full font-medium text-text-muted bg-navy-800">Closed</span>;
  }
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium text-brand bg-brand-ghost">Open</span>;
}

export function PositionRow({ position, onTraded }: PositionRowProps) {
  const { claimWinnings, isSubmitting } = useTrading(position.marketId);

  const catClass = CATEGORY_COLORS[position.category] ?? "text-text-secondary bg-navy-800";

  const canClaim =
    position.resolved &&
    !position.claimed &&
    (
      (position.outcome === Outcome.YES && position.yesShares > 0n) ||
      (position.outcome === Outcome.NO  && position.noShares  > 0n) ||
      (position.outcome === Outcome.INVALID && (position.yesShares > 0n || position.noShares > 0n))
    );

  const handleClaim = async () => {
    await claimWinnings();
    onTraded?.();
  };

  return (
    <div className="bg-surface-card border border-border rounded-xl p-4 hover:border-border-light transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", catClass)}>
              {position.category}
            </span>
            <StatusBadge status={position.marketStatus} outcome={position.outcome} />
          </div>
          <Link
            href={`/market/${position.marketId.toString()}`}
            className="text-sm font-medium text-text-primary hover:text-brand transition-colors line-clamp-2 leading-snug"
          >
            {position.question}
          </Link>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-text-primary">${position.currentValue.toFixed(2)}</p>
          <p className="text-xs text-text-muted">est. value</p>
        </div>
      </div>

      {/* Shares + Entry/Current prices + P&L */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3">
        {position.yesShares > 0n && (
          <div>
            <p className="text-xs text-text-muted mb-0.5">YES shares</p>
            <p className="text-sm font-semibold text-yes">{formatShares(position.yesShares)}</p>
          </div>
        )}
        {position.noShares > 0n && (
          <div>
            <p className="text-xs text-text-muted mb-0.5">NO shares</p>
            <p className="text-sm font-semibold text-no">{formatShares(position.noShares)}</p>
          </div>
        )}
        {/* YES P&L */}
        {position.yesShares > 0n && position.avgYesEntry > 0 && (
          <div>
            <p className="text-xs text-text-muted mb-0.5">YES entry → now</p>
            <p className="text-sm font-semibold text-text-secondary">
              {formatSharePrice(position.avgYesEntry)} → {formatSharePrice(position.yesProbability)}
              <span className={`ml-1.5 text-xs ${position.pnlYes >= 0 ? "text-yes" : "text-no"}`}>
                {position.pnlYes >= 0 ? "+" : ""}{position.pnlYes.toFixed(2)} mUSDC
              </span>
            </p>
          </div>
        )}
        {/* NO P&L */}
        {position.noShares > 0n && position.avgNoEntry > 0 && (
          <div>
            <p className="text-xs text-text-muted mb-0.5">NO entry → now</p>
            <p className="text-sm font-semibold text-text-secondary">
              {formatSharePrice(position.avgNoEntry)} → {formatSharePrice(1 - position.yesProbability)}
              <span className={`ml-1.5 text-xs ${position.pnlNo >= 0 ? "text-yes" : "text-no"}`}>
                {position.pnlNo >= 0 ? "+" : ""}{position.pnlNo.toFixed(2)} mUSDC
              </span>
            </p>
          </div>
        )}
        {/* Current price if no entry data */}
        {position.avgYesEntry === 0 && position.avgNoEntry === 0 && (
          <div className="ml-auto">
            <p className="text-xs text-text-muted mb-0.5">Current price</p>
            <p className="text-sm font-semibold text-text-secondary">
              YES {formatSharePrice(position.yesProbability)}
            </p>
          </div>
        )}
      </div>

      {/* Probability bar */}
      <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-brand rounded-full transition-all duration-500"
          style={{ width: `${(position.yesProbability * 100).toFixed(1)}%` }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {position.marketStatus === "open" && (
          <Link href={`/market/${position.marketId.toString()}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">Trade</Button>
          </Link>
        )}
        {canClaim && (
          <Button
            variant="yes"
            size="sm"
            loading={isSubmitting}
            onClick={handleClaim}
            className="flex-1"
          >
            Claim Winnings
          </Button>
        )}
        {position.claimed && (
          <span className="text-xs text-text-muted self-center">Claimed ✓</span>
        )}
        {position.marketStatus === "closed" && !position.resolved && (
          <span className="text-xs text-text-muted self-center">Awaiting resolution</span>
        )}
      </div>
    </div>
  );
}
