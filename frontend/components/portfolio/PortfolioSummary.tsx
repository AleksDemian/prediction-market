"use client";

import { useAccount, useReadContract } from "wagmi";
import { mockUsdcConfig } from "@/lib/contracts";
import { formatUsdc } from "@/lib/formatting";

interface PortfolioSummaryProps {
  totalValue: number;
  positionCount: number;
  claimableCount: number;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-navy-800 rounded-xl p-4 border border-border">
      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}

export function PortfolioSummary({ totalValue, positionCount, claimableCount }: PortfolioSummaryProps) {
  const { address } = useAccount();
  const { data: balance } = useReadContract({
    ...mockUsdcConfig,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address, refetchInterval: 60_000 },
  });

  const balanceStr = balance != null ? `${formatUsdc(balance as bigint)} mUSDC` : "—";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <StatCard
        label="Portfolio Value"
        value={`$${totalValue.toFixed(2)}`}
        sub="estimated"
      />
      <StatCard
        label="Open Positions"
        value={positionCount.toString()}
        sub="markets"
      />
      <StatCard
        label="Claimable"
        value={claimableCount.toString()}
        sub="resolved markets"
      />
      <StatCard
        label="Wallet Balance"
        value={balanceStr}
      />
    </div>
  );
}
