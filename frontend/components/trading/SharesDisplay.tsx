"use client";

import { useAccount, useReadContract } from "wagmi";
import { predictionMarketConfig } from "@/lib/contracts";
import { formatShares } from "@/lib/formatting";
import { Outcome, type MarketInfo } from "@/types/market";

interface SharesDisplayProps {
  market: MarketInfo;
}

export function SharesDisplay({ market }: SharesDisplayProps) {
  const { address } = useAccount();
  const { data: pos } = useReadContract({
    ...predictionMarketConfig,
    functionName: "getUserPosition",
    args: [market.id, address!],
    query: { enabled: !!address, refetchInterval: 15_000 },
  }) as { data: { yesShares: bigint; noShares: bigint; claimed: boolean } | undefined };

  if (!address || !pos || (pos.yesShares === 0n && pos.noShares === 0n)) return null;

  return (
    <div className="bg-surface-card border border-accent-dim/20 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-3 text-sm">Your Position</h3>
      <div className="space-y-2">
        {pos.yesShares > 0n && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yes" />
              <span className="text-sm text-accent-dim">YES shares</span>
            </div>
            <span className="text-sm font-medium text-yes">{formatShares(pos.yesShares)}</span>
          </div>
        )}
        {pos.noShares > 0n && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-no" />
              <span className="text-sm text-accent-dim">NO shares</span>
            </div>
            <span className="text-sm font-medium text-no">{formatShares(pos.noShares)}</span>
          </div>
        )}
        {pos.claimed && (
          <p className="text-xs text-accent-dim mt-1">Winnings already claimed</p>
        )}
        {market.resolved && !pos.claimed && (
          <p className="text-xs text-yes mt-1">
            {market.outcome === Outcome.YES && pos.yesShares > 0n && "You won! Claim your winnings below."}
            {market.outcome === Outcome.NO  && pos.noShares  > 0n && "You won! Claim your winnings below."}
          </p>
        )}
      </div>
    </div>
  );
}
