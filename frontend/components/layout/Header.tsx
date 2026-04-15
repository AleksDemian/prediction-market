"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { mockUsdcConfig } from "@/lib/contracts";
import { formatUsdc } from "@/lib/formatting";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useQueryClient } from "@tanstack/react-query";

function UsdcBalance() {
  const { address } = useAccount();
  const { data: balance } = useReadContract({
    ...mockUsdcConfig,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address, refetchInterval: 15_000 },
  });
  if (!address || balance === undefined) return null;
  return (
    <span className="text-sm text-accent-dim">
      {formatUsdc(balance as bigint)} mUSDC
    </span>
  );
}

function FaucetButton() {
  const { address } = useAccount();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const handleFaucet = async () => {
    if (!address) return;
    try {
      const res = await fetch("/api/demo/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast("1 000 mUSDC received!", "success", json.hash);
        setTimeout(() => queryClient.invalidateQueries(), 3000);
      } else {
        addToast(json.error ?? "Faucet failed", "error");
      }
    } catch {
      addToast("Faucet request failed", "error");
    }
  };

  if (!address) return null;
  return (
    <Button variant="outline" size="sm" onClick={handleFaucet}>
      Get mUSDC
    </Button>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-accent-dim/20 bg-navy/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center">
            <span className="text-accent font-bold text-sm">PM</span>
          </div>
          <div className="leading-tight">
            <div className="text-white font-semibold text-sm">Prediction Market</div>
            <div className="text-accent-dim text-xs">Demo · Sepolia</div>
          </div>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <UsdcBalance />
          <FaucetButton />
          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
          />
        </div>
      </div>
    </header>
  );
}
