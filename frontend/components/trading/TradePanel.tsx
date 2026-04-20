"use client";

import { useState } from "react";
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import { useTrading, isUserRejection } from "@/hooks/useTrading";
import { useAllowance } from "@/hooks/useAllowance";
import { predictionMarketConfig, mockUsdcConfig } from "@/lib/contracts";
import { parseUsdc, formatUsdc, formatShares, formatSharePrice } from "@/lib/formatting";
import { MIN_TRADE_USDC } from "@/constants";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { MarketWithPool } from "@/types/market";

interface TradePanelProps {
  data: MarketWithPool;
}

type Tab = "buy" | "sell";

export function TradePanel({ data }: TradePanelProps) {
  const { market, yesProbability } = data;
  const { address } = useAccount();
  const { addToast } = useToast();
  const [tab, setTab]                   = useState<Tab>("buy");
  const [isYes, setIsYes]               = useState(true);
  const [amountStr, setAmountStr]       = useState("10");
  const [sellAmountStr, setSellAmountStr] = useState("");

  const trading      = useTrading(market.id);
  const allowance    = useAllowance();
  const publicClient = usePublicClient();

  const { data: usdcBalance } = useReadContract({
    ...mockUsdcConfig,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address },
  });

  const now = BigInt(Math.floor(Date.now() / 1000));
  const isClosed = market.resolved || now >= market.closingTime;

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
  const sharesAvailable = isYes ? (userPos?.yesShares ?? 0n) : (userPos?.noShares ?? 0n);

  const sellAmountBig = (() => {
    try { return parseUsdc(sellAmountStr || "0"); } catch { return 0n; }
  })();
  const sellAmountClamped = sellAmountBig > sharesAvailable ? sharesAvailable : sellAmountBig;

  const { data: collateralOutData } = useReadContract({
    ...predictionMarketConfig,
    functionName: "getCollateralOut",
    args: [market.id, isYes, sellAmountClamped],
    query: { enabled: tab === "sell" && sellAmountClamped > 0n && !isClosed },
  });
  const collateralOut = collateralOutData ? (collateralOutData as [bigint, bigint])[0] : undefined;

  const handleBuy = async () => {
    if (!address) { addToast("Connect your wallet first", "info"); return; }
    if (amountBig < MIN_TRADE_USDC) { addToast("Minimum trade is 1 mUSDC", "info"); return; }

    if (allowance.needsApproval(amountBig)) {
      addToast("Approving mUSDC…", "pending");
      try {
        const approveHash = await allowance.approve(amountBig * 10n);
        addToast("Approval submitted — waiting for confirmation…", "pending", approveHash);
        await publicClient!.waitForTransactionReceipt({ hash: approveHash });
        await allowance.refetch();
      } catch (e: unknown) {
        addToast(isUserRejection(e) ? "Approval cancelled" : "Approval failed", isUserRejection(e) ? "info" : "error");
        return;
      }
    }

    addToast("Submitting trade…", "pending");
    try {
      const hash = await trading.buyShares(isYes, amountBig);
      addToast(`Trade submitted! Buying ${isYes ? "YES" : "NO"} shares`, "pending", hash);
    } catch (e: unknown) {
      if (isUserRejection(e)) {
        addToast("Transaction cancelled", "info");
      } else if (trading.error) {
        addToast(trading.error, "error");
      }
    }
  };

  const handleSell = async () => {
    if (!address) { addToast("Connect your wallet first", "info"); return; }
    if (sharesAvailable === 0n) { addToast("No shares to sell", "info"); return; }
    if (sellAmountClamped === 0n) { addToast("Enter the amount of shares to sell", "info"); return; }

    addToast("Submitting sell…", "pending");
    try {
      const hash = await trading.sellShares(isYes, sellAmountClamped);
      addToast(`Selling ${isYes ? "YES" : "NO"} shares`, "pending", hash);
    } catch (e: unknown) {
      if (isUserRejection(e)) {
        addToast("Transaction cancelled", "info");
      } else if (trading.error) {
        addToast(trading.error, "error");
      }
    }
  };

  const addAmount = (delta: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr(String(Math.max(1, current + delta)));
  };

  const setMaxBuy = () => {
    if (usdcBalance) {
      setAmountStr(formatUsdc(usdcBalance as bigint));
    }
  };

  if (!address) {
    return (
      <div className="bg-surface-card border border-border rounded-xl p-5 text-center">
        <p className="text-text-muted text-sm">Connect your wallet to trade</p>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="bg-surface-card border border-border rounded-xl p-5 text-center">
        <p className="text-text-muted text-sm">Market closed for trading</p>
      </div>
    );
  }

  const avgBuyPrice = sharesOut && sharesOut > 0n
    ? Number(amountBig) / Number(sharesOut)
    : (isYes ? yesProbability : 1 - yesProbability);

  const avgSellPrice = sellAmountClamped > 0n && collateralOut
    ? Number(collateralOut) / Number(sellAmountClamped)
    : (isYes ? yesProbability : 1 - yesProbability);

  return (
    <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border px-4 pt-3">
        {(["buy", "sell"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`mr-5 pb-2.5 text-sm font-semibold capitalize transition-colors border-b-2 ${
              tab === t
                ? "text-text-primary border-brand"
                : "text-text-muted border-transparent hover:text-text-secondary"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* YES / NO buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsYes(true)}
            className={`flex-1 py-3 rounded-xl text-base font-bold transition-all ${
              isYes
                ? "bg-yes text-white"
                : "bg-navy-800 text-text-secondary hover:bg-navy-700 border border-border"
            }`}
          >
            Yes {formatSharePrice(yesProbability)}
          </button>
          <button
            onClick={() => setIsYes(false)}
            className={`flex-1 py-3 rounded-xl text-base font-bold transition-all ${
              !isYes
                ? "bg-no text-white"
                : "bg-navy-800 text-text-secondary hover:bg-navy-700 border border-border"
            }`}
          >
            No {formatSharePrice(1 - yesProbability)}
          </button>
        </div>

        {tab === "buy" ? (
          <>
            {/* Amount */}
            <div className="bg-navy-800 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm font-medium">Amount</span>
                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    value={amountStr}
                    min="1"
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="bg-transparent text-text-primary text-2xl font-bold text-right w-28 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    placeholder="0"
                  />
                  <span className="text-text-muted text-sm">mUSDC</span>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3">
                {[1, 5, 10, 100].map((v) => (
                  <button
                    key={v}
                    onClick={() => addAmount(v)}
                    className="flex-1 py-1.5 text-xs font-medium bg-navy-900 hover:bg-navy-700 text-text-secondary hover:text-text-primary rounded-lg transition-colors border border-border"
                  >
                    +${v}
                  </button>
                ))}
                <button
                  onClick={setMaxBuy}
                  className="flex-1 py-1.5 text-xs font-medium bg-navy-900 hover:bg-navy-700 text-text-secondary hover:text-text-primary rounded-lg transition-colors border border-border"
                >
                  Max
                </button>
              </div>
            </div>

            {/* To win */}
            <div className="flex items-center justify-between py-2 border-t border-border">
              <div>
                <p className="text-text-primary text-sm font-semibold">To win 💵</p>
                <p className="text-text-muted text-xs mt-0.5">
                  Avg. Price {formatSharePrice(avgBuyPrice)}
                </p>
              </div>
              <p className={`text-2xl font-bold ${sharesOut ? "text-yes" : "text-text-muted"}`}>
                {sharesOut ? `${formatUsdc(sharesOut)} mUSDC` : "—"}
              </p>
            </div>

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
            {/* Sell: shares input */}
            <div className="bg-navy-800 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-sm font-medium">Shares</span>
                <input
                  type="number"
                  value={sellAmountStr}
                  min="0"
                  onChange={(e) => setSellAmountStr(e.target.value)}
                  className="bg-transparent text-text-primary text-2xl font-bold text-right w-32 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  placeholder="0"
                />
              </div>
              <p className="text-text-muted text-xs mt-1">
                Balance: <span className="text-text-secondary">{formatShares(sharesAvailable)}</span> shares
              </p>
              <div className="flex gap-1.5 mt-3">
                {[25, 50, 75].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setSellAmountStr(formatShares(sharesAvailable * BigInt(pct) / 100n))}
                    className="flex-1 py-1.5 text-xs font-medium bg-navy-900 hover:bg-navy-700 text-text-secondary hover:text-text-primary rounded-lg transition-colors border border-border"
                  >
                    {pct}%
                  </button>
                ))}
                <button
                  onClick={() => setSellAmountStr(formatShares(sharesAvailable))}
                  className="flex-1 py-1.5 text-xs font-medium bg-navy-900 hover:bg-navy-700 text-text-secondary hover:text-text-primary rounded-lg transition-colors border border-border"
                >
                  Max
                </button>
              </div>
            </div>

            {/* You receive */}
            <div className="flex items-center justify-between py-2 border-t border-border">
              <div>
                <p className="text-text-primary text-sm font-semibold">You receive</p>
                <p className="text-text-muted text-xs mt-0.5">
                  Sell price {formatSharePrice(avgSellPrice)}
                </p>
              </div>
              <p className={`text-2xl font-bold ${collateralOut && sellAmountClamped > 0n ? "text-yes" : "text-text-muted"}`}>
                {collateralOut && sellAmountClamped > 0n ? `${formatUsdc(collateralOut)} mUSDC` : "—"}
              </p>
            </div>

            <Button
              variant={isYes ? "yes" : "no"}
              size="lg"
              className="w-full"
              loading={trading.isSubmitting}
              disabled={sharesAvailable === 0n || sellAmountClamped === 0n}
              onClick={handleSell}
            >
              Sell {isYes ? "YES" : "NO"}
            </Button>
          </>
        )}

        {trading.error && (
          <p className="text-no text-xs text-center">{trading.error}</p>
        )}
      </div>
    </div>
  );
}
