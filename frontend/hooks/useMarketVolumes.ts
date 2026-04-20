"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { PREDICTION_MARKET_ABI } from "@/lib/contracts";
import { MARKET_ADDRESS, CONTRACT_DEPLOY_BLOCK } from "@/constants";

interface UseMarketVolumesResult {
  volumesByMarket: Map<string, bigint>;
}

/**
 * Global volume fetch — a single query shared across the whole app.
 *
 * Previously accepted an optional `marketId` and issued per-market queries, which
 * doubled `getLogs` calls on the market detail page (one for the listing cache,
 * one for the detail cache). The global variant fetches everything once; callers
 * that only care about a single market select from the returned Map.
 *
 * Volumes are invalidated in `useTrading` after every successful buy/sell, so
 * we don't need a background `refetchInterval` — a long `staleTime` is enough.
 */
export function useMarketVolumes() {
  const client = usePublicClient();

  return useQuery({
    queryKey: ["marketVolumes", "all"],
    queryFn: async (): Promise<UseMarketVolumesResult> => {
      if (!client) return { volumesByMarket: new Map() };

      const [bought, sold] = await Promise.all([
        client.getContractEvents({
          address: MARKET_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          eventName: "SharesBought",
          fromBlock: CONTRACT_DEPLOY_BLOCK,
        }),
        client.getContractEvents({
          address: MARKET_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          eventName: "SharesSold",
          fromBlock: CONTRACT_DEPLOY_BLOCK,
        }),
      ]);

      const volumesByMarket = new Map<string, bigint>();
      const addVolume = (id: bigint, amount: bigint) => {
        const key = id.toString();
        volumesByMarket.set(key, (volumesByMarket.get(key) ?? 0n) + amount);
      };

      for (const event of bought) {
        const parsed = event.args as { marketId: bigint; collateralIn: bigint };
        addVolume(parsed.marketId, parsed.collateralIn);
      }

      for (const event of sold) {
        const parsed = event.args as { marketId: bigint; collateralOut: bigint };
        addVolume(parsed.marketId, parsed.collateralOut);
      }

      return { volumesByMarket };
    },
    enabled: !!client,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
  });
}
