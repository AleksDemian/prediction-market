"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { mockUsdcConfig } from "@/lib/contracts";
import { formatUsdc } from "@/lib/formatting";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function UsdcBalance() {
  const { address } = useAccount();
  const { data: balance } = useReadContract({
    ...mockUsdcConfig,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: !!address, refetchInterval: 60_000 },
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

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  // Check 24h cooldown
  const { data: lastFaucetTs } = useReadContract({
    ...mockUsdcConfig,
    functionName: "lastFaucet",
    args: [address!],
    query: { enabled: !!address },
  });
  // `Date.now()` is impure — call it in an effect and tick every 30s so the
  // 24h cooldown indicator flips to "Get mUSDC" without a full page reload.
  const [nowSec, setNowSec] = useState(0);
  useEffect(() => {
    const tick = () => setNowSec(Math.floor(Date.now() / 1000));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  const cooldownEnds = lastFaucetTs ? Number(lastFaucetTs) + 86400 : 0;
  const onCooldown = nowSec > 0 && cooldownEnds > nowSec;

  // Show toast on confirmation
  useEffect(() => {
    if (isConfirmed && txHash) {
      addToast("1 000 mUSDC received!", "success", txHash);
      // Indexer + RPC propagation can lag a few seconds; burst invalidation keeps
      // balance and portfolio UI fresh right after faucet confirmation.
      (async () => {
        for (let i = 0; i < 4; i++) {
          queryClient.invalidateQueries();
          await sleep(2_000);
        }
      })();
    }
  }, [isConfirmed, txHash, addToast, queryClient]);

  // Show toast on wallet error
  useEffect(() => {
    if (writeError) {
      const msg = writeError.message.includes("User rejected")
        ? "Transaction cancelled"
        : (writeError as { shortMessage?: string }).shortMessage ?? writeError.message;
      addToast(msg, "error");
    }
  }, [writeError, addToast]);

  if (!address) return null;

  const busy = isPending || isConfirming;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy || onCooldown}
      onClick={() => writeContract({ ...mockUsdcConfig, functionName: "faucet", args: [] })}
    >
      {isPending ? "Confirm in wallet…" : isConfirming ? "Confirming…" : onCooldown ? "Cooldown 24h" : "Get mUSDC"}
    </Button>
  );
}

export function Header() {
  const { isConnected } = useAccount();
  const pathname = usePathname();

  const navLinks = [
    { href: "/",           label: "Markets" },
    { href: "/portfolio",  label: "Portfolio", requiresWallet: true },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-navy/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo + Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-brand-ghost border border-brand/30 flex items-center justify-center">
              <span className="text-brand font-bold text-sm">PM</span>
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="text-text-primary font-semibold text-sm">Prediction Market</div>
              <div className="text-text-muted text-xs">Demo · Sepolia</div>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map((link) => {
              if (link.requiresWallet && !isConnected) return null;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-sm transition-colors",
                    isActive
                      ? "text-text-primary bg-navy-800"
                      : "text-text-secondary hover:text-text-primary hover:bg-navy-800"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

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
