"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { PositionRow } from "./PositionRow";
import type { PortfolioPosition } from "@/hooks/usePortfolio";

type Tab = "active" | "resolved" | "all";

interface PositionsListProps {
  positions: PortfolioPosition[];
  onTraded?: () => void;
}

export function PositionsList({ positions, onTraded }: PositionsListProps) {
  const [tab, setTab] = useState<Tab>("active");

  const active   = positions.filter((p) => p.marketStatus !== "resolved");
  const resolved = positions.filter((p) => p.marketStatus === "resolved");

  const displayed = tab === "active" ? active : tab === "resolved" ? resolved : positions;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "active",   label: "Active",   count: active.length },
    { id: "resolved", label: "Resolved", count: resolved.length },
    { id: "all",      label: "All",      count: positions.length },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-brand text-navy"
                : "text-text-secondary hover:text-text-primary hover:bg-navy-800"
            )}
          >
            {t.label}
            <span className={clsx(
              "ml-1.5 text-xs px-1.5 py-0.5 rounded-full",
              tab === t.id ? "bg-brand-dark text-white" : "bg-navy-800 text-text-muted"
            )}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {displayed.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <p className="text-base mb-2">No positions here</p>
          {tab === "active" && (
            <Link href="/" className="text-brand text-sm hover:text-brand-light transition-colors">
              Browse markets to start trading →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayed.map((pos) => (
            <PositionRow
              key={pos.marketId.toString()}
              position={pos}
              onTraded={onTraded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
