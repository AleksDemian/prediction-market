"use client";

import { clsx } from "clsx";
import type { FilterState, FilterStatus, SortBy } from "@/hooks/useMarketFilters";

interface MarketFiltersProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  categories: string[];
  resultCount: number;
  onReset: () => void;
}

const STATUS_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "all",      label: "All" },
  { value: "open",     label: "Open" },
  { value: "closed",   label: "Closed" },
  { value: "resolved", label: "Resolved" },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "volume",      label: "Volume" },
  { value: "closing",     label: "Closing Soon" },
  { value: "newest",      label: "Newest" },
  { value: "probability", label: "Most Decisive" },
];

export function MarketFilters({ filters, onChange, categories, resultCount, onReset }: MarketFiltersProps) {
  const set = <K extends keyof FilterState>(key: K, val: FilterState[K]) =>
    onChange({ ...filters, [key]: val });

  const hasActiveFilters =
    filters.category !== "all" ||
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.sortBy !== "volume";

  return (
    <div className="bg-surface-card border border-border rounded-xl p-4 mb-6 space-y-4">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search markets..."
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="w-full bg-navy-800 border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-brand/50 transition-colors"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => set("category", "all")}
          className={clsx(
            "px-3 py-1 rounded-full text-xs font-medium transition-colors",
            filters.category === "all"
              ? "bg-brand text-navy"
              : "bg-navy-800 text-text-secondary border border-border hover:border-border-light"
          )}
        >
          All Markets
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => set("category", cat)}
            className={clsx(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              filters.category === cat
                ? "bg-brand text-navy"
                : "bg-navy-800 text-text-secondary border border-border hover:border-border-light"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Status + Sort + Count */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted">Status:</span>
          <select
            value={filters.status}
            onChange={(e) => set("status", e.target.value as FilterStatus)}
            className="bg-navy-800 border border-border rounded-md text-xs text-text-secondary px-2 py-1 focus:outline-none focus:border-brand/50"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted">Sort:</span>
          <select
            value={filters.sortBy}
            onChange={(e) => set("sortBy", e.target.value as SortBy)}
            className="bg-navy-800 border border-border rounded-md text-xs text-text-secondary px-2 py-1 focus:outline-none focus:border-brand/50"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <span className="text-xs text-text-muted ml-auto">
          {resultCount} {resultCount === 1 ? "market" : "markets"}
        </span>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-xs text-brand hover:text-brand-light transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
