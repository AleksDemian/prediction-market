"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient, useAccount } from "wagmi";
import { PREDICTION_MARKET_ABI } from "@/lib/contracts";
import { MARKET_ADDRESS, CONTRACT_DEPLOY_BLOCK } from "@/constants";

export interface MarketTradeStats {
  avgYesEntry: number;   // avg mUSDC per YES share (0-1 scale), 0 if no buys
  avgNoEntry:  number;   // avg mUSDC per NO share  (0-1 scale), 0 if no buys
  totalYesCost: number;  // total mUSDC spent on YES shares
  totalNoCost:  number;  // total mUSDC spent on NO shares
}

export type UserTradeStats = Record<string, MarketTradeStats>;

export function useUserTrades() {
  const client = usePublicClient();
  const { address } = useAccount();

  return useQuery({
    queryKey: ["userTrades", address],
    queryFn: async (): Promise<UserTradeStats> => {
      if (!client || !address) return {};

      const [bought, sold] = await Promise.all([
        client.getContractEvents({
          address: MARKET_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          eventName: "SharesBought",
          args: { buyer: address },
          fromBlock: CONTRACT_DEPLOY_BLOCK,
        }),
        client.getContractEvents({
          address: MARKET_ADDRESS,
          abi: PREDICTION_MARKET_ABI,
          eventName: "SharesSold",
          args: { seller: address },
          fromBlock: CONTRACT_DEPLOY_BLOCK,
        }),
      ]);

      // Per-market accumulators: total cost and total shares for YES and NO
      const acc: Record<string, {
        yesCost: bigint; yesShares: bigint;
        noCost:  bigint; noShares:  bigint;
      }> = {};

      for (const ev of bought) {
        const { marketId, isYes, collateralIn, sharesOut } = ev.args as {
          marketId: bigint; isYes: boolean; collateralIn: bigint; sharesOut: bigint;
        };
        const key = marketId.toString();
        if (!acc[key]) acc[key] = { yesCost: 0n, yesShares: 0n, noCost: 0n, noShares: 0n };
        if (isYes) {
          acc[key].yesCost   += collateralIn;
          acc[key].yesShares += sharesOut;
        } else {
          acc[key].noCost   += collateralIn;
          acc[key].noShares += sharesOut;
        }
      }

      // Reduce cost basis proportionally when shares were sold (avg cost method)
      for (const ev of sold) {
        const { marketId, isYes, sharesIn } = ev.args as {
          marketId: bigint; isYes: boolean; sharesIn: bigint;
        };
        const key = marketId.toString();
        if (!acc[key]) continue;
        if (isYes && acc[key].yesShares > 0n) {
          const ratio = sharesIn > acc[key].yesShares ? 1n : sharesIn * 1000000n / acc[key].yesShares;
          const costReduction = acc[key].yesCost * ratio / 1000000n;
          acc[key].yesCost   -= costReduction;
          acc[key].yesShares -= sharesIn > acc[key].yesShares ? acc[key].yesShares : sharesIn;
        } else if (!isYes && acc[key].noShares > 0n) {
          const ratio = sharesIn > acc[key].noShares ? 1n : sharesIn * 1000000n / acc[key].noShares;
          const costReduction = acc[key].noCost * ratio / 1000000n;
          acc[key].noCost   -= costReduction;
          acc[key].noShares -= sharesIn > acc[key].noShares ? acc[key].noShares : sharesIn;
        }
      }

      const stats: UserTradeStats = {};
      for (const [key, v] of Object.entries(acc)) {
        // avgEntry in 0-1 scale (shares are 1e6 precision, same as mUSDC)
        const avgYesEntry = v.yesShares > 0n ? Number(v.yesCost) / Number(v.yesShares) : 0;
        const avgNoEntry  = v.noShares  > 0n ? Number(v.noCost)  / Number(v.noShares)  : 0;
        stats[key] = {
          avgYesEntry,
          avgNoEntry,
          totalYesCost: Number(v.yesCost) / 1e6,
          totalNoCost:  Number(v.noCost)  / 1e6,
        };
      }

      return stats;
    },
    enabled: !!client && !!address,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
  });
}
