"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useQueryClient } from "@tanstack/react-query";
import { PortfolioSummary } from "@/components/portfolio/PortfolioSummary";
import { PositionsList } from "@/components/portfolio/PositionsList";
import { Skeleton } from "@/components/ui/Skeleton";

function PortfolioSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const { isConnected } = useAccount();
  const queryClient = useQueryClient();

  const {
    positions,
    activePositions,
    claimablePositions,
    totalValue,
    isLoading,
  } = usePortfolio();

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Portfolio</h1>
        <p className="text-text-secondary mb-6">Connect your wallet to see your positions</p>
        <ConnectButton />
      </div>
    );
  }

  const handleTraded = () => {
    setTimeout(() => queryClient.invalidateQueries(), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-1">Portfolio</h1>
        <p className="text-text-secondary text-sm">Your positions across all markets</p>
      </div>

      {isLoading ? (
        <PortfolioSkeleton />
      ) : (
        <>
          <PortfolioSummary
            totalValue={totalValue}
            positionCount={activePositions.length}
            claimableCount={claimablePositions.length}
          />
          {positions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-text-secondary text-lg mb-2">No positions yet</p>
              <p className="text-text-muted text-sm">
                Browse markets and start trading to see your portfolio here.
              </p>
            </div>
          ) : (
            <PositionsList positions={positions} onTraded={handleTraded} />
          )}
        </>
      )}
    </div>
  );
}
