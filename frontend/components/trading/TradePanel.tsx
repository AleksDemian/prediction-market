"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useTrading } from "@/hooks/useTrading";
import { useAllowance } from "@/hooks/useAllowance";
import { predictionMarketConfig, mockUsdcConfig } from "@/lib/contracts";
import { parseUsdc, formatUsdc, formatShares } from "@/lib/formatting";
import { MIN_TRADE_USDC, MARKET_ADDRESS } from "@/constants";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { MarketWithPool } from "@/types/market";
import { Outcome } from "@/types/market";

interface TradePanelProps {
  data: MarketWithPool;
}

type Tab = "buy" | "sell";

export function TradePanel({ data }: TradePanelProps) {
  const { market, pool, yesProbability } = data;
  const { address } = useAccount();
  const { addToast } = useToast();
  const [tab, setTab]           = useState<Tab>("buy");
  const [isYes, setIsYes]       = useState(true);
  const [amountStr, setAmountStr] = useState("10");

  const trading  = useTrading(market.id);
  const allowance = useAllowance();

  const now = BigInt(Math.floor(Date.now() / 1000));
  const isClosed = market.resolved || now >= market.closingTime;

  // Estimate output
  const amountBig = (() => { try { return parseUsdc(amountStr || "0"); } catch { return 0n; } })();
  const { data: sharesOutData } = useReadContract({
    ...predictionMarketConfig,
    functionName: "getSharesOut",
    args: [market.id, isYes, amountBig],
    query: { enabled: !isClosed && tab === "buy" && amountBig >= MIN_TRADE_USDC },
  });

  const { data: userPos } = useReadContract({
    ...predictionMarketConfig,
    functionName: "getUserPosition",
    args: [market.id, address!],
    query: { enabled: !!address },
  }) as { data: { yesShares: bigint; noShares: bigint; claimed: boolean } | undefined };

  const sharesOut = sharesOutData ? (sharesOutData as [bigint, bigint])[0] : undefined;
  const sharesAvailable = tab === "sell" ? (isYes ? (userPos?.yesShares ?? 0n) : (userPos?.noShares ?? 0n)) : 0n;

  const handleBuy = async () => {
    if (!address) { addToast("Connect your wallet first", "info"); return; }
    if (amountBig < MIN_TRADE_USDC) { addToast("Minimum trade is 1 mUSDC", "info"); return; }

    // Check / request approval
    if (allowance.needsApproval(amountBig)) {
      addToast("Approving mUSDC…", "pending");
      try {
        const approveHash = await allowance.approve(amountBig * 10n); // approve generously
        addToast("Approval submitted", "pending", approveHash);
        await new Promise(r => setTimeout(r, 3000)); // wait a bit for confirmation
      } catch {
        addToast("Approval rejected", "error");
        return;
      }
    }

    addToast("Submitting trade…", "pending");
    try {
      const hash = await trading.buyShares(isYes, amountBig);
      addToast(`Trade submitted! Buying ${isYes ? "YES" : "NO"} shares`, "pending", hash);
    } catch {
      if (trading.error) addToast(trading.error, "error");
    }
  };

  const handleSell = async () => {
    if (!address) { addToast("Connect your wallet first", "info"); return; }
    if (sharesAvailable === 0n) { addToast("No shares to sell", "info"); return; }

    addToast("Submitting sell…", "pending");
    try {
      const hash = await trading.sellShares(isYes, sharesAvailable);
      addToast(`Selling ${isYes ? "YES" : "NO"} shares`, "pending", hash);
    } catch {
      if (trading.error) addToast(trading.error, "error");
    }
  };

  if (!address) {
    return (
      <div className="bg-surface-card border border-accent-dim/20 rounded-xl p-5 text-center">
        <p className="text-accent-dim text-sm">Connect your wallet to trade</p>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="bg-surface-card border border-accent-dim/20 rounded-xl p-5 text-center">
        <p className="text-accent-dim text-sm">
          {market.resolved ? "Market resolved — see claim panel below" : "Market closed for trading"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-card border border-accent-dim/20 rounded-xl p-5 space-y-4">
      <h3 className="text-white font-semibold">Trade</h3>

      {/* Tab switcher */}
      <div className="flex bg-navy rounded-lg p-1 gap-1">
        {(["buy", "sell"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors capitalize
              ${tab === t ? "bg-accent/10 text-accent border border-accent/20" : "text-accent-dim hover:text-white"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* YES / NO toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setIsYes(true)}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
            ${isYes ? "bg-yes-muted border-yes text-yes" : "bg-navy-800 border-accent-dim/30 text-accent-dim hover:border-yes/50"}`}
        >
          YES · {(yesProbability * 100).toFixed(1)}%
        </button>
        <button
          onClick={() => setIsYes(false)}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
            ${!isYes ? "bg-no-muted border-no text-no" : "bg-navy-800 border-accent-dim/30 text-accent-dim hover:border-no/50"}`}
        >
          NO · {((1 - yesProbability) * 100).toFixed(1)}%
        </button>
      </div>

      {tab === "buy" ? (
        <>
          {/* Amount input */}
          <div>
            <label className="text-xs text-accent-dim mb-1 block">Amount (mUSDC)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={amountStr}
                min="1"
                onChange={(e) => setAmountStr(e.target.value)}
                className="flex-1 bg-navy border border-accent-dim/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent/50"
                placeholder="10"
              />
              {[10, 50, 100].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmountStr(String(v))}
                  className="px-2 py-2 text-xs bg-navy-800 border border-accent-dim/30 rounded-lg text-accent-dim hover:text-white"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Estimated output */}
          {sharesOut !== undefined && (
            <div className="text-xs text-accent-dim bg-navy rounded-lg p-3">
              <div className="flex justify-between">
                <span>Estimated shares</span>
                <span className="text-white font-medium">{formatShares(sharesOut)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Fee (2%)</span>
                <span>{formatUsdc((amountBig * 200n) / 10000n)} mUSDC</span>
              </div>
            </div>
          )}

          <Button
            variant={isYes ? "yes" : "no"}
            size="lg"
            className="w-full"
            loading={trading.isSubmitting}
            onClick={handleBuy}
          >
            Buy {isYes ? "YES" : "NO"}
          </Button>
        </>
      ) : (
        <>
          {/* Sell shares */}
          <div className="text-sm text-accent-dim bg-navy rounded-lg p-3">
            <div className="flex justify-between">
              <span>Your {isYes ? "YES" : "NO"} shares</span>
              <span className="text-white font-medium">{formatShares(sharesAvailable)}</span>
            </div>
          </div>

          <Button
            variant={isYes ? "yes" : "no"}
            size="lg"
            className="w-full"
            loading={trading.isSubmitting}
            disabled={sharesAvailable === 0n}
            onClick={handleSell}
          >
            Sell all {isYes ? "YES" : "NO"} shares
          </Button>
        </>
      )}

      {trading.error && (
        <p className="text-no text-xs text-center">{trading.error}</p>
      )}
    </div>
  );
}
