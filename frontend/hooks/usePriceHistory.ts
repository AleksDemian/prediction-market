"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { PREDICTION_MARKET_ABI } from "@/lib/contracts";
import { MARKET_ADDRESS, CONTRACT_DEPLOY_BLOCK } from "@/constants";
import { batchGetBlockTimestamps } from "@/lib/events";

export interface PricePoint {
  timestamp: number;   // unix seconds
  probability: number; // 0-1
  blockNumber: bigint;
}

export function usePriceHistory(marketId: bigint, createdAt?: number) {
  const client = usePublicClient();

  return useQuery({
    queryKey: ["priceHistory", marketId.toString()],
    queryFn: async (): Promise<PricePoint[]> => {
      if (!client || marketId <= 0n) return [];

      // Fetch SharesBought and SharesSold events for this market
      const [bought, sold] = await Promise.all([
        client.getContractEvents({
          address: MARKET_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          eventName: "SharesBought",
          args: { marketId },
          fromBlock: CONTRACT_DEPLOY_BLOCK,
        }),
        client.getContractEvents({
          address: MARKET_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          eventName: "SharesSold",
          args: { marketId },
          fromBlock: CONTRACT_DEPLOY_BLOCK,
        }),
      ]);

      // Merge and sort by block number
      const all = [...bought, ...sold]
        .filter((e) => e.blockNumber != null)
        .sort((a, b) => Number(a.blockNumber! - b.blockNumber!));

      if (all.length === 0) {
        // No trades yet — return just the starting point if we have it
        const ts = createdAt ?? Math.floor(Date.now() / 1000);
        return [{ timestamp: ts, probability: 0.5, blockNumber: 0n }];
      }

      // Batch-fetch all block timestamps
      const blockNums = all.map((e) => e.blockNumber!);
      const timestamps = await batchGetBlockTimestamps(client, blockNums);

      // Build price points, starting at 50%
      const startTs = createdAt ?? timestamps.get(all[0].blockNumber!)! - 60;
      const points: PricePoint[] = [
        { timestamp: startTs, probability: 0.5, blockNumber: 0n },
      ];

      for (const event of all) {
        const args = event.args as { newYesProbability?: bigint };
        if (args.newYesProbability == null) continue;
        const ts = timestamps.get(event.blockNumber!);
        if (ts == null) continue;
        points.push({
          timestamp: ts,
          probability: Number(args.newYesProbability) / 1e18,
          blockNumber: event.blockNumber!,
        });
      }

      return points;
    },
    enabled: !!client && marketId > 0n,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
  });
}
