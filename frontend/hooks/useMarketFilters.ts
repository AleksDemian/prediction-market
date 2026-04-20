"use client";

import { useState, useMemo } from "react";
import type { MarketWithPool } from "@/types/market";

export type FilterStatus = "all" | "open" | "closed" | "resolved";
export type SortBy = "volume" | "closing" | "newest" | "probability";

export interface FilterState {
  category: string;   // "all" | category string
  search: string;
  status: FilterStatus;
  sortBy: SortBy;
}

const DEFAULT_FILTERS: FilterState = {
  category: "all",
  search: "",
  status: "all",
  sortBy: "volume",
};

export function useMarketFilters(markets: MarketWithPool[]) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const filteredMarkets = useMemo(() => {
    const now = BigInt(Math.floor(Date.now() / 1000));

    let result = markets.filter((m) => {
      // Category filter
      if (filters.category !== "all") {
        if (m.market.category.toLowerCase() !== filters.category.toLowerCase()) return false;
      }

      // Search filter
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        if (!m.market.question.toLowerCase().includes(q)) return false;
      }

      // Status filter
      if (filters.status !== "all") {
        const isResolved = m.market.resolved;
        const isClosed = !isResolved && m.market.closingTime <= now;
        const isOpen = !isResolved && m.market.closingTime > now;

        if (filters.status === "open" && !isOpen) return false;
        if (filters.status === "closed" && !isClosed) return false;
        if (filters.status === "resolved" && !isResolved) return false;
      }

      return true;
    });

    // Sort
    result = [...result].sort((a, b) => {
      switch (filters.sortBy) {
        case "volume":
          if (a.volume === b.volume) return 0;
          return a.volume > b.volume ? -1 : 1;
        case "closing":
          return Number(a.market.closingTime - b.market.closingTime);
        case "newest":
          return Number(b.market.id - a.market.id);
        case "probability":
          // Most decisive: furthest from 50%
          return (
            Math.abs(b.yesProbability - 0.5) - Math.abs(a.yesProbability - 0.5)
          );
        default:
          return 0;
      }
    });

    return result;
  }, [markets, filters]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const m of markets) {
      if (m.market.category) seen.add(m.market.category);
    }
    return [...seen].sort();
  }, [markets]);

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  return { filters, setFilters, filteredMarkets, categories, resetFilters };
}
