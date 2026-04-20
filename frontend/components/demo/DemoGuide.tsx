"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { useQueryClient } from "@tanstack/react-query";
import { useTrading } from "@/hooks/useTrading";
import { useAllowance } from "@/hooks/useAllowance";
import { useMarket } from "@/hooks/useMarket";
import { parseUsdc } from "@/lib/formatting";

const DEMO_MARKET_ID = 6n; // Market 6 is the demo market
const DEMO_TRADE_AMOUNT = parseUsdc(20); // 20 mUSDC

interface Step {
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { label: "Connect Wallet",   description: "Connect your MetaMask wallet to get started" },
  { label: "Get Test mUSDC",   description: "Claim 1 000 free mUSDC from the demo faucet" },
  { label: "Buy YES Shares",   description: "Buy 20 mUSDC worth of YES on the demo market" },
  { label: "Market Resolves",  description: "Admin resolves the demo market as YES winner" },
  { label: "Claim Winnings",   description: "Claim your winning shares as mUSDC" },
];

export function DemoGuide() {
  const { address } = useAccount();
  const { addToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const trading   = useTrading(DEMO_MARKET_ID);
  const allowance = useAllowance();

  const { data: demoMarket } = useMarket(DEMO_MARKET_ID);

  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));

  const handleStep = async () => {
    setLoading(true);
    try {
      // Step 0: connect wallet — handled by RainbowKit button
      if (step === 0) {
        if (!address) { addToast("Please connect your wallet first", "info"); return; }
        next();
        return;
      }

      // Step 1: faucet
      if (step === 1) {
        if (!address) { addToast("Connect wallet first", "info"); return; }
        const res = await fetch("/api/demo/faucet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });
        const json = await res.json();
        if (res.ok) {
          addToast("1 000 mUSDC received!", "success", json.hash);
          setTimeout(() => queryClient.invalidateQueries(), 3000);
          next();
        } else {
          addToast(json.error ?? "Faucet failed", "error");
        }
        return;
      }

      // Step 2: buy YES shares on demo market
      if (step === 2) {
        if (!address) { addToast("Connect wallet first", "info"); return; }

        // Navigate to the demo market first
        router.push(`/market/${DEMO_MARKET_ID.toString()}`);

        // If market is already closed, skip buying and advance to resolve step
        const now = BigInt(Math.floor(Date.now() / 1000));
        const isClosed = demoMarket && now >= demoMarket.market.closingTime;
        if (isClosed) {
          addToast("Demo market already closed — skipping to resolve step", "info");
          next();
          return;
        }

        // Approve if needed
        if (allowance.needsApproval(DEMO_TRADE_AMOUNT)) {
          const approveHash = await allowance.approve(DEMO_TRADE_AMOUNT * 10n);
          addToast("Approving mUSDC…", "pending", approveHash);
          await new Promise(r => setTimeout(r, 4000));
        }

        try {
          const hash = await trading.buyShares(true, DEMO_TRADE_AMOUNT, 0n);
          addToast("Bought YES shares on demo market!", "pending", hash);
          setTimeout(() => { queryClient.invalidateQueries(); next(); }, 4000);
        } catch {
          addToast("Market closed — proceeding to resolve step", "info");
          next();
        }
        return;
      }

      // Step 3: admin resolves market
      if (step === 3) {
        const res = await fetch("/api/demo/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marketId: DEMO_MARKET_ID.toString(), outcome: 1 }), // 1 = YES
        });
        const json = await res.json();
        if (res.ok) {
          addToast("Demo market resolved: YES wins!", "success", json.hash);
          setTimeout(() => { queryClient.invalidateQueries(); next(); }, 4000);
        } else {
          addToast(json.error ?? "Resolve failed", "error");
        }
        return;
      }

      // Step 4: claim winnings
      if (step === 4) {
        router.push(`/market/${DEMO_MARKET_ID.toString()}`);
        const hash = await trading.claimWinnings();
        addToast("Winnings claimed!", "success", hash);
        setTimeout(() => { queryClient.invalidateQueries(); setStep(0); }, 5000);
        return;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      addToast(msg.includes("fetch") ? "Network error — try again" : msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-40 w-80 bg-surface-card border border-accent/30 rounded-xl shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-accent-dim/20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yes animate-pulse" />
          <span className="text-sm font-semibold text-white">Demo Guide</span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-accent-dim hover:text-white text-lg leading-none">×</button>
      </div>

      {/* Steps */}
      <div className="px-4 py-3 space-y-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5
              ${i < step  ? "bg-yes text-white" :
                i === step ? "bg-accent/20 border border-accent text-accent" :
                             "bg-navy-800 border border-accent-dim/30 text-accent-dim"}`}>
              {i < step ? "✓" : i + 1}
            </div>
            <div>
              <p className={`text-sm font-medium ${i === step ? "text-white" : i < step ? "text-accent-dim line-through" : "text-accent-dim"}`}>
                {s.label}
              </p>
              {i === step && (
                <p className="text-xs text-accent-dim mt-0.5">{s.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action */}
      <div className="px-4 pb-4">
        <Button
          variant="primary"
          size="md"
          className="w-full"
          loading={loading || trading.isSubmitting}
          onClick={handleStep}
        >
          {step === 0 && !address ? "Connect Wallet First" :
           step === 0             ? "Next →" :
           step === 1             ? "Get 1 000 mUSDC" :
           step === 2             ? "Buy YES Shares" :
           step === 3             ? "Resolve Market" :
                                    "Claim Winnings"}
        </Button>
      </div>
    </div>
  );
}
