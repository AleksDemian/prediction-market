"use client";

import { useAccount, useReadContract } from "wagmi";
import { predictionMarketConfig } from "@/lib/contracts";
import { useTrading } from "@/hooks/useTrading";
import { formatShares } from "@/lib/formatting";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Outcome, type MarketInfo } from "@/types/market";

interface ClaimPanelProps {
  market: MarketInfo;
}

export function ClaimPanel({ market }: ClaimPanelProps) {
  const { address } = useAccount();
  const { addToast } = useToast();
  const trading = useTrading(market.id);

  const { data: pos } = useReadContract({
    ...predictionMarketConfig,
    functionName: "getUserPosition",
    args: [market.id, address!],
    query: { enabled: !!address && market.resolved, refetchInterval: 10_000 },
  }) as { data: { yesShares: bigint; noShares: bigint; claimed: boolean } | undefined };

  if (!address || !market.resolved || !pos) return null;
  if (pos.claimed) return null;

  const winningShares =
    market.outcome === Outcome.YES ? pos.yesShares :
    market.outcome === Outcome.NO  ? pos.noShares  :
    pos.yesShares + pos.noShares;

  if (winningShares === 0n) return null;

  const handleClaim = async () => {
    addToast("Claiming winnings…", "pending");
    try {
      const hash = await trading.claimWinnings();
      addToast(`Claimed ${formatShares(winningShares)} mUSDC!`, "success", hash);
    } catch {
      addToast(trading.error ?? "Claim failed", "error");
    }
  };

  return (
    <div className="bg-yes-muted/10 border border-yes/30 rounded-xl p-5">
      <h3 className="text-yes font-semibold mb-2">Claim Winnings</h3>
      <p className="text-sm text-accent-dim mb-4">
        You have <span className="text-white font-medium">{formatShares(winningShares)} mUSDC</span> to claim.
      </p>
      <Button
        variant="yes"
        size="lg"
        className="w-full"
        loading={trading.isSubmitting}
        onClick={handleClaim}
      >
        Claim {formatShares(winningShares)} mUSDC
      </Button>
    </div>
  );
}
