"use client";

import { useEffect, useRef, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { predictionMarketConfig } from "@/lib/contracts";
import type { MarketWithPool } from "@/types/market";
import { usePollAfterAdminTx } from "@/hooks/useMarketSync";

interface PendingResolve {
  marketId: bigint;
  outcome: 1 | 2 | 3;
}

export function useResolveMarket() {
  const queryClient = useQueryClient();
  const pollAfterAdminTx = usePollAfterAdminTx();
  const pendingRef = useRef<PendingResolve | null>(null);
  const [lastResolved, setLastResolved] = useState<PendingResolve | null>(null);

  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  useEffect(() => {
    if (!isSuccess || !pendingRef.current) return;
    const { marketId, outcome } = pendingRef.current;

    // Optimistic cache update — UI reflects resolved state immediately
    queryClient.setQueryData(
      ["markets"],
      (old: MarketWithPool[] | undefined) => {
        if (!old) return old;
        return old.map((item) =>
          item.market.id === marketId
            ? { ...item, market: { ...item.market, resolved: true, outcome } }
            : item
        );
      }
    );

    setLastResolved({ marketId, outcome });
    pendingRef.current = null;
    pollAfterAdminTx();
  }, [isSuccess, pollAfterAdminTx, queryClient]);

  const resolve = (marketId: bigint, outcome: 1 | 2 | 3) => {
    pendingRef.current = { marketId, outcome };
    reset();
    writeContract({
      ...predictionMarketConfig,
      functionName: "forceResolveMarket",
      args: [marketId, outcome],
    });
  };

  return {
    resolve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    writeError,
    lastResolved,
  };
}
