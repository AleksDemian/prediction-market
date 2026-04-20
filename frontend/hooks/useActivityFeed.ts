"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { PREDICTION_MARKET_ABI } from "@/lib/contracts";
import { MARKET_ADDRESS, CONTRACT_DEPLOY_BLOCK } from "@/constants";
import { batchGetBlockTimestamps } from "@/lib/events";

export type ActivityType = "buy" | "sell" | "resolve" | "claim";

export interface ActivityEvent {
  type: ActivityType;
  marketId: bigint;
  user: `0x${string}`;
  timestamp: number;
  blockNumber: bigint;
  txHash: `0x${string}`;
  // Type-specific
  isYes?: boolean;
  collateralAmount?: bigint; // spend (buy) or receive (sell/claim)
  shares?: bigint;
  outcome?: number; // for resolve
}

interface UseActivityFeedOptions {
  marketId?: bigint;
  limit?: number;
}

export function useActivityFeed({ marketId, limit = 50 }: UseActivityFeedOptions = {}) {
  const client = usePublicClient();

  return useQuery({
    queryKey: ["activity", marketId?.toString() ?? "global"],
    queryFn: async (): Promise<ActivityEvent[]> => {
      if (!client) return [];

      const args = marketId != null ? { marketId } : undefined;

      const [bought, sold, resolved, claimed] = await Promise.all([
        client.getContractEvents({
          address: MARKET_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          eventName: "SharesBought",
          args,
          fromBlock: CONTRACT_DEPLOY_BLOCK,
        }),
        client.getContractEvents({
          address: MARKET_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          eventName: "SharesSold",
          args,
          fromBlock: CONTRACT_DEPLOY_BLOCK,
        }),
        client.getContractEvents({
          address: MARKET_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          eventName: "MarketResolved",
          args,
          fromBlock: CONTRACT_DEPLOY_BLOCK,
        }),
        client.getContractEvents({
          address: MARKET_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          eventName: "WinningsClaimed",
          args,
          fromBlock: CONTRACT_DEPLOY_BLOCK,
        }),
      ]);

      // Sort all events newest-first
      const all = [...bought, ...sold, ...resolved, ...claimed]
        .filter((e) => e.blockNumber != null && e.transactionHash != null)
        .sort((a, b) => Number(b.blockNumber! - a.blockNumber!))
        .slice(0, limit);

      if (all.length === 0) return [];

      const blockNums = all.map((e) => e.blockNumber!);
      const timestamps = await batchGetBlockTimestamps(client, blockNums);

      const events: ActivityEvent[] = [];

      for (const e of all) {
        const ts = timestamps.get(e.blockNumber!) ?? 0;
        const base = {
          blockNumber: e.blockNumber!,
          txHash: e.transactionHash as `0x${string}`,
          timestamp: ts,
        };

        if (e.eventName === "SharesBought") {
          const a = e.args as { marketId: bigint; buyer: `0x${string}`; isYes: boolean; collateralIn: bigint; sharesOut: bigint };
          events.push({ type: "buy", marketId: a.marketId, user: a.buyer, isYes: a.isYes, collateralAmount: a.collateralIn, shares: a.sharesOut, ...base });
        } else if (e.eventName === "SharesSold") {
          const a = e.args as { marketId: bigint; seller: `0x${string}`; isYes: boolean; sharesIn: bigint; collateralOut: bigint };
          events.push({ type: "sell", marketId: a.marketId, user: a.seller, isYes: a.isYes, collateralAmount: a.collateralOut, shares: a.sharesIn, ...base });
        } else if (e.eventName === "MarketResolved") {
          const a = e.args as { marketId: bigint; outcome: number; resolver: `0x${string}` };
          events.push({ type: "resolve", marketId: a.marketId, user: a.resolver, outcome: a.outcome, ...base });
        } else if (e.eventName === "WinningsClaimed") {
          const a = e.args as { marketId: bigint; claimer: `0x${string}`; amount: bigint };
          events.push({ type: "claim", marketId: a.marketId, user: a.claimer, collateralAmount: a.amount, ...base });
        }
      }

      return events;
    },
    enabled: !!client,
    // Event history is invalidated in useTrading after every successful trade,
    // so we rely on that instead of a background refetch interval.
    staleTime: 5 * 60_000,
    refetchOnMount: false,
  });
}
