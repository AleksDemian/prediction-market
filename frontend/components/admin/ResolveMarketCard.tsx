"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { clsx } from "clsx";
import type { MarketWithPool } from "@/types/market";
import { Outcome } from "@/types/market";
import { useResolveMarket } from "@/hooks/useResolveMarket";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { formatSharePrice, formatTimeLeft } from "@/lib/formatting";

const CATEGORY_COLORS: Record<string, string> = {
  Crypto:     "text-brand bg-brand-ghost",
  Sports:     "text-info bg-info/10",
  Technology: "text-warning bg-warning/10",
  Finance:    "text-invalid bg-invalid/10",
  Demo:       "text-yes bg-yes-muted/20",
};

const OUTCOME_LABELS: Record<number, string> = {
  [Outcome.YES]:     "YES",
  [Outcome.NO]:      "NO",
  [Outcome.INVALID]: "INVALID",
};

interface Props {
  data: MarketWithPool;
}

export function ResolveMarketCard({ data }: Props) {
  const { market, yesProbability } = data;
  const { isConnected } = useAccount();
  const { addToast } = useToast();
  const { resolve, isPending, isConfirming, isSuccess, writeError, lastResolved, hash } =
    useResolveMarket();

  const [clickedOutcome, setClickedOutcome] = useState<1 | 2 | 3 | null>(null);

  const busy = isPending || isConfirming;
  const justResolved = isSuccess && lastResolved?.marketId === market.id;

  useEffect(() => {
    if (!writeError) return;
    const msg = writeError.message.includes("User rejected")
      ? "Transaction cancelled"
      : (writeError as { shortMessage?: string }).shortMessage ?? writeError.message;
    addToast(msg, "error");
  }, [writeError, addToast]);

  const handleResolve = (outcome: 1 | 2 | 3) => {
    if (!isConnected) {
      addToast("Connect your wallet to resolve markets", "error");
      return;
    }
    setClickedOutcome(outcome);
    resolve(market.id, outcome);
  };

  if (market.resolved || justResolved) {
    const outcomeVal = justResolved
      ? (lastResolved?.outcome ?? market.outcome)
      : market.outcome;
    return (
      <div className="bg-surface-card border border-border rounded-xl p-5 opacity-60">
        <div className="flex items-start justify-between gap-3">
          <p className="text-text-secondary text-sm line-clamp-2 flex-1">
            {market.question}
          </p>
          <span
            className={clsx(
              "shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium",
              outcomeVal === Outcome.YES
                ? "text-yes bg-yes-muted/20"
                : outcomeVal === Outcome.NO
                ? "text-no bg-no-muted/20"
                : "text-text-muted bg-navy-800"
            )}
          >
            {OUTCOME_LABELS[outcomeVal] ?? "Resolved"}
          </span>
        </div>
        {justResolved && hash && (
          <a
            href={`https://sepolia.etherscan.io/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 text-xs text-brand hover:underline block"
          >
            View transaction ↗
          </a>
        )}
      </div>
    );
  }

  const yesPct = (yesProbability * 100).toFixed(1);

  return (
    <div className="bg-surface-card border border-border rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span
          className={clsx(
            "shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium",
            CATEGORY_COLORS[market.category] ?? "text-text-secondary bg-navy-800"
          )}
        >
          {market.category}
        </span>
        <span className="text-xs text-text-muted">
          Closes {formatTimeLeft(market.closingTime)}
        </span>
      </div>

      {/* Question */}
      <p className="text-text-primary text-sm font-medium leading-snug mb-4 line-clamp-2">
        {market.question}
      </p>

      {/* Probability bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-yes font-semibold">
            YES {formatSharePrice(yesProbability)}
          </span>
          <span className="text-no font-semibold">
            NO {formatSharePrice(1 - yesProbability)}
          </span>
        </div>
        <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-500"
            style={{ width: `${yesPct}%` }}
          />
        </div>
      </div>

      {/* Resolve buttons */}
      <div className="flex gap-2">
        {([1, 2, 3] as const).map((outcome) => {
          const isThis = clickedOutcome === outcome;
          const loading = isThis && busy;
          return (
            <Button
              key={outcome}
              variant={outcome === 1 ? "yes" : outcome === 2 ? "no" : "outline"}
              size="sm"
              loading={loading}
              disabled={busy || !isConnected}
              onClick={() => handleResolve(outcome)}
              className="flex-1"
            >
              {loading
                ? isPending
                  ? "Confirm…"
                  : "Confirming…"
                : OUTCOME_LABELS[outcome]}
            </Button>
          );
        })}
      </div>

      {!isConnected && (
        <p className="text-xs text-text-muted mt-2 text-center">
          Connect wallet to resolve
        </p>
      )}
    </div>
  );
}
