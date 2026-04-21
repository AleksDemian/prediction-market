"use client";

import { useQuery } from "@tanstack/react-query";
import type { ActivityRow } from "@/lib/queries";

export type ActivityType = "buy" | "sell" | "resolve" | "claim";

export interface ActivityEvent {
  type: ActivityType;
  marketId: bigint;
  user: `0x${string}`;
  timestamp: number;
  blockNumber: bigint;
  txHash: `0x${string}` | null;
  isYes?: boolean;
  collateralAmount?: bigint;
  shares?: bigint;
  outcome?: number;
}

interface UseActivityFeedOptions {
  marketId?: bigint;
  limit?: number;
}

function parseActivityRow(row: ActivityRow): ActivityEvent {
  const txHash =
    row.tx_hash && row.tx_hash.startsWith("0x")
      ? (row.tx_hash as `0x${string}`)
      : null;

  const base: ActivityEvent = {
    type: row.type,
    marketId: BigInt(row.market_id),
    user: row.user_addr as `0x${string}`,
    timestamp: row.timestamp,
    blockNumber: BigInt(row.block_number),
    txHash,
  };

  if (row.type === "buy" || row.type === "sell") {
    base.isYes = Boolean(row.is_yes);
    base.collateralAmount = BigInt(row.collateral ?? 0);
    base.shares = BigInt(row.shares ?? 0);
  } else if (row.type === "resolve") {
    base.outcome = row.outcome ?? 0;
  } else if (row.type === "claim") {
    base.collateralAmount = BigInt(row.amount ?? 0);
  }

  return base;
}

export function useActivityFeed({
  marketId,
  limit = 50,
}: UseActivityFeedOptions = {}) {
  return useQuery({
    queryKey: ["activity", marketId?.toString() ?? "global"],
    queryFn: async (): Promise<ActivityEvent[]> => {
      if (!marketId) return [];
      const res = await fetch(
        `/api/markets/${marketId}/activity?limit=${limit}`
      );
      if (!res.ok) throw new Error(`activity fetch failed: ${res.status}`);
      const rows: ActivityRow[] = await res.json();
      return rows.map(parseActivityRow);
    },
    enabled: marketId != null && marketId > 0n,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    // Keep steady-state polling light; useTrading triggers a temporary fast
    // refresh cycle right after writes so activity and chart stay in sync.
    refetchInterval: 30_000,
  });
}
