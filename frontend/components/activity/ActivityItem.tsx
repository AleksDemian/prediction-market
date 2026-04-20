"use client";

import { clsx } from "clsx";
import type { ActivityEvent } from "@/hooks/useActivityFeed";
import { formatMUSDC, formatTimeAgo, truncateAddress, getEtherscanUrl } from "@/lib/formatting";

const OUTCOME_LABELS = ["Unresolved", "YES", "NO", "INVALID"];

interface ActivityItemProps {
  event: ActivityEvent;
  showMarketQuestion?: boolean;
  question?: string;
}

function TypeIcon({ type, isYes }: { type: ActivityEvent["type"]; isYes?: boolean }) {
  if (type === "buy" || type === "sell") {
    return (
      <div
        className={clsx(
          "w-2 h-2 rounded-full flex-shrink-0 mt-1",
          isYes ? "bg-yes" : "bg-no"
        )}
      />
    );
  }
  if (type === "resolve") {
    return <div className="w-2 h-2 rounded-full bg-info flex-shrink-0 mt-1" />;
  }
  return <div className="w-2 h-2 rounded-full bg-warning flex-shrink-0 mt-1" />;
}

function activityLabel(event: ActivityEvent): string {
  const side = event.isYes ? "YES" : "NO";
  switch (event.type) {
    case "buy":    return `bought ${formatMUSDC(event.collateralAmount ?? 0n)} of ${side}`;
    case "sell":   return `sold ${side} for ${formatMUSDC(event.collateralAmount ?? 0n)}`;
    case "resolve":return `resolved → ${OUTCOME_LABELS[event.outcome ?? 0]}`;
    case "claim":  return `claimed ${formatMUSDC(event.collateralAmount ?? 0n)}`;
    default:       return "";
  }
}

export function ActivityItem({ event, showMarketQuestion, question }: ActivityItemProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <TypeIcon type={event.type} isYes={event.isYes} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-text-secondary font-mono truncate">
            <a
              href={getEtherscanUrl("address", event.user)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand transition-colors"
            >
              {truncateAddress(event.user)}
            </a>
            {" "}
            <span className="text-text-primary">{activityLabel(event)}</span>
          </span>
          <span className="text-xs text-text-muted whitespace-nowrap flex-shrink-0">
            {formatTimeAgo(event.timestamp)}
          </span>
        </div>

        {showMarketQuestion && question && (
          <p className="text-xs text-text-muted mt-0.5 truncate">{question}</p>
        )}
      </div>

      <a
        href={getEtherscanUrl("tx", event.txHash)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-text-dim hover:text-brand transition-colors flex-shrink-0 mt-0.5"
        title="View on Etherscan"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
}
