"use client";

import { useAccount, useReadContract } from "wagmi";
import { predictionMarketConfig } from "@/lib/contracts";
import { useTrading, isUserRejection } from "@/hooks/useTrading";
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

  if (!market.resolved) return null;

  const outcomeLabel =
    market.outcome === Outcome.YES ? "YES" :
    market.outcome === Outcome.NO  ? "NO"  : "INVALID";

  // Still loading position data
  if (!pos) {
    return (
      <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-text-primary">Claim Winnings</span>
        </div>
        <div className="p-4">
          <p className="text-text-muted text-sm text-center py-4">Loading…</p>
        </div>
      </div>
    );
  }

  const winningShares =
    market.outcome === Outcome.YES ? pos.yesShares :
    market.outcome === Outcome.NO  ? pos.noShares  :
    pos.yesShares + pos.noShares;

  const handleClaim = async () => {
    addToast("Claiming winnings…", "pending");
    try {
      const hash = await trading.claimWinnings();
      addToast(`Claimed ${formatShares(winningShares)} mUSDC!`, "success", hash);
    } catch (e: unknown) {
      if (isUserRejection(e)) {
        addToast("Transaction cancelled", "info");
      } else {
        addToast(trading.error ?? "Claim failed", "error");
      }
    }
  };

  // Already claimed or no winning shares
  if (pos.claimed || winningShares === 0n) {
    return (
      <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-text-primary">Market Resolved</span>
        </div>
        <div className="p-4 text-center py-8 space-y-1">
          <p className="text-yes font-semibold">Outcome: {outcomeLabel}</p>
          <p className="text-text-muted text-sm">
            {pos.claimed ? "Winnings already claimed ✓" : "No winning position"}
          </p>
        </div>
      </div>
    );
  }

  // Not connected — don't show claim UI
  if (!address) return null;

  return (
    <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold text-text-primary">Claim Winnings</span>
      </div>
      <div className="p-4 space-y-4">
        <div className="bg-yes-muted/10 border border-yes/20 rounded-xl p-4 text-center space-y-1">
          <p className="text-text-muted text-xs uppercase tracking-wide">You won</p>
          <p className="text-yes text-3xl font-bold">{formatShares(winningShares)} mUSDC</p>
          <p className="text-text-muted text-xs">Outcome: {outcomeLabel}</p>
        </div>
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
    </div>
  );
}
