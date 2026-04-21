"use client";

import { useEffect, useRef } from "react";
import { useReadContracts, useAccount } from "wagmi";
import { useMarkets } from "./useMarkets";
import { useUserTrades } from "./useUserTrades";
import { predictionMarketConfig } from "@/lib/contracts";
import type { Position } from "@/types/market";
import { Outcome } from "@/types/market";

export interface PortfolioPosition {
  marketId: bigint;
  question: string;
  category: string;
  yesProbability: number;
  yesShares: bigint;
  noShares: bigint;
  claimed: boolean;
  currentValue: number;        // estimated value in mUSDC (float)
  marketStatus: "open" | "closed" | "resolved";
  outcome: number;
  resolved: boolean;
  closingTime: bigint;
  resolutionTime: bigint;
  totalCollateral: bigint;
  // Entry price tracking (0 if unknown)
  avgYesEntry: number;   // avg price paid per YES share (0-1 scale)
  avgNoEntry:  number;   // avg price paid per NO share  (0-1 scale)
  pnlYes: number;        // unrealized P&L for YES position in mUSDC
  pnlNo:  number;        // unrealized P&L for NO position in mUSDC
}

export function usePortfolio() {
  const { address } = useAccount();
  const {
    markets,
    isLoading: marketsLoading,
    error: marketsError,
  } = useMarkets();
  const {
    data: tradeStats,
    isLoading: tradesLoading,
    error: tradesError,
  } = useUserTrades();

  // Multicall: fetch user position for every market in one RPC call
  const contracts = markets.map((m) => ({
    ...predictionMarketConfig,
    functionName: "getUserPosition" as const,
    args: [m.market.id, address!] as [bigint, `0x${string}`],
  }));

  const {
    data: positionsData,
    isLoading: positionsLoading,
    error: positionsError,
  } = useReadContracts({
    contracts,
    query: {
      enabled: !!address && markets.length > 0,
      refetchInterval: 30_000,
      staleTime: 20_000,
    },
  });

  const positions: PortfolioPosition[] = [];

  if (positionsData && markets.length > 0) {
    const now = BigInt(Math.floor(Date.now() / 1000));

    for (let i = 0; i < markets.length; i++) {
      const result = positionsData[i];
      if (!result || result.status !== "success") continue;

      const pos = result.result as Position;
      const hasPosition = pos.yesShares > 0n || pos.noShares > 0n;
      const hasUnclaimed = markets[i].market.resolved && !pos.claimed && (pos.yesShares > 0n || pos.noShares > 0n);

      if (!hasPosition && !hasUnclaimed) continue;

      const m = markets[i];
      const { market, pool, yesProbability } = m;

      // Current value estimation based on current market probability
      // yesShares * P(YES) + noShares * P(NO), in mUSDC (1 share = 1 mUSDC at resolution)
      const yesVal = Number(pos.yesShares) / 1e6 * yesProbability;
      const noVal  = Number(pos.noShares)  / 1e6 * (1 - yesProbability);
      const currentValue = yesVal + noVal;

      // Entry price and P&L from trade history
      const ts = tradeStats?.[market.id.toString()];
      const avgYesEntry = ts?.avgYesEntry ?? 0;
      const avgNoEntry  = ts?.avgNoEntry  ?? 0;
      // P&L: (currentPrice - avgEntry) × sharesHeld (in mUSDC)
      const pnlYes = avgYesEntry > 0 ? (yesProbability - avgYesEntry) * Number(pos.yesShares) / 1e6 : 0;
      const pnlNo  = avgNoEntry  > 0 ? ((1 - yesProbability) - avgNoEntry) * Number(pos.noShares) / 1e6 : 0;

      // Market status
      let marketStatus: "open" | "closed" | "resolved";
      if (market.resolved) {
        marketStatus = "resolved";
      } else if (market.closingTime <= now) {
        marketStatus = "closed";
      } else {
        marketStatus = "open";
      }

      positions.push({
        marketId: market.id,
        question: market.question,
        category: market.category,
        yesProbability,
        yesShares: pos.yesShares,
        noShares:  pos.noShares,
        claimed:   pos.claimed,
        currentValue,
        marketStatus,
        outcome: market.outcome,
        resolved: market.resolved,
        closingTime: market.closingTime,
        resolutionTime: market.resolutionTime,
        totalCollateral: pool.totalCollateral,
        avgYesEntry,
        avgNoEntry,
        pnlYes,
        pnlNo,
      });
    }
  }

  const lastStablePositionsRef = useRef<PortfolioPosition[]>([]);
  const hasTransientError = !!marketsError || !!tradesError || !!positionsError;
  const isAnyLoading =
    marketsLoading ||
    tradesLoading ||
    (!!address && markets.length > 0 && positionsLoading);

  useEffect(() => {
    if (!address) {
      lastStablePositionsRef.current = [];
      return;
    }
    // Cache only meaningful snapshots to avoid replacing good data with empty
    // transitional states when API/indexer is catching up.
    if (positions.length > 0) {
      lastStablePositionsRef.current = positions;
    }
  }, [address, positions]);

  const stablePositions =
    positions.length === 0 && (isAnyLoading || hasTransientError)
      ? lastStablePositionsRef.current
      : positions;

  // Summary stats
  const totalValue = stablePositions.reduce((acc, p) => {
    if (p.resolved) {
      // For resolved markets, value is exact
      const outcome = p.outcome;
      if (outcome === Outcome.YES) return acc + Number(p.yesShares) / 1e6;
      if (outcome === Outcome.NO)  return acc + Number(p.noShares)  / 1e6;
      if (outcome === Outcome.INVALID) return acc + (Number(p.yesShares) + Number(p.noShares)) / 1e6;
      return acc;
    }
    return acc + p.currentValue;
  }, 0);

  const activePositions   = stablePositions.filter((p) => p.marketStatus === "open" || p.marketStatus === "closed");
  const resolvedPositions = stablePositions.filter((p) => p.marketStatus === "resolved");
  const claimablePositions = resolvedPositions.filter((p) => {
    if (p.claimed) return false;
    const outcome = p.outcome;
    if (outcome === Outcome.YES && p.yesShares > 0n) return true;
    if (outcome === Outcome.NO  && p.noShares  > 0n) return true;
    if (outcome === Outcome.INVALID && (p.yesShares > 0n || p.noShares > 0n)) return true;
    return false;
  });

  return {
    positions: stablePositions,
    activePositions,
    resolvedPositions,
    claimablePositions,
    totalValue,
    isLoading: isAnyLoading && stablePositions.length === 0,
  };
}
