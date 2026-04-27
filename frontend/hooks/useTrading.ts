"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { predictionMarketConfig, mockUsdcConfig } from "@/lib/contracts";
import { MARKET_ADDRESS } from "@/constants";
import { useCallback, useEffect, useRef, useState } from "react";

export function isUserRejection(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return msg.includes("user rejected") || msg.includes("user denied");
}

function mapTradingError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("proposal expired")) {
    return "Запит у гаманці протерміновано. Повторіть операцію та підтвердьте її швидше.";
  }
  if (normalized.includes("user rejected") || normalized.includes("user denied")) {
    return "Транзакцію скасовано користувачем";
  }
  if (normalized.includes("gas limit too high") || normalized.includes("intrinsic gas too high")) {
    return "Помилка оцінки газу. Перевірте, чи підтверджено approve, і спробуйте ще раз.";
  }
  if (normalized.includes("insufficient allowance") || normalized.includes("erc20: insufficient allowance")) {
    return "Недостатній approve. Спробуйте ще раз — approve має підтвердитися першим.";
  }
  return "Транзакція не виконана";
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function useTrading(marketId: bigint) {
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();

  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const pollGenerationRef = useRef(0);

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: pendingHash,
    query: { enabled: !!pendingHash },
  });

  const requestIndexerRefresh = useCallback(async () => {
    try {
      await fetch("/api/indexer/refresh", { method: "POST" });
    } catch {
      // The scheduled poll still catches up if the internal refresh endpoint is unavailable.
    }
  }, []);

  // Poll local API after a mined transaction so the UI reflects the indexed event
  // without keeping the indexer on a high-frequency RPC loop all day.
  const pollAfterTrade = useCallback(() => {
    pollGenerationRef.current += 1;
    const generation = pollGenerationRef.current;
    const keys = [
      ["market", marketId.toString()],
      ["activity", marketId.toString()],
      ["priceHistory", marketId.toString()],
      ["markets"],
      ...(address ? [["userTrades", address]] : []),
    ];
    const attempts = 15;
    (async () => {
      await requestIndexerRefresh();
      for (let i = 0; i < attempts; i++) {
        await sleep(2_000);
        if (generation !== pollGenerationRef.current) return;
        if (i === 0) {
          queryClient.invalidateQueries({ type: "active" });
        }
        keys.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
      }
    })();
  }, [address, marketId, queryClient, requestIndexerRefresh]);

  useEffect(() => {
    if (isConfirmed && pendingHash) {
      pollAfterTrade();
      setPendingHash(undefined);
    }
  }, [isConfirmed, pendingHash, pollAfterTrade]);

  useEffect(() => {
    return () => {
      pollGenerationRef.current += 1;
    };
  }, []);

  const buyShares = async (
    isYes: boolean,
    collateralIn: bigint,
    minSharesOut: bigint = 0n
  ) => {
    setIsSubmitting(true);
    setError(undefined);
    try {
      const hash = await writeContractAsync({
        ...predictionMarketConfig,
        functionName: "buyShares",
        args: [marketId, isYes, collateralIn, minSharesOut],
      });
      setPendingHash(hash);
      return hash;
    } catch (e: unknown) {
      if (!isUserRejection(e)) {
        const msg = e instanceof Error ? e.message : "Transaction failed";
        setError(mapTradingError(msg));
      }
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  };

  const sellShares = async (
    isYes: boolean,
    sharesIn: bigint,
    minCollateralOut: bigint = 0n
  ) => {
    setIsSubmitting(true);
    setError(undefined);
    try {
      const hash = await writeContractAsync({
        ...predictionMarketConfig,
        functionName: "sellShares",
        args: [marketId, isYes, sharesIn, minCollateralOut],
      });
      setPendingHash(hash);
      return hash;
    } catch (e: unknown) {
      if (!isUserRejection(e)) {
        const msg = e instanceof Error ? e.message : "Transaction failed";
        setError(mapTradingError(msg));
      }
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  };

  const claimWinnings = async () => {
    setIsSubmitting(true);
    setError(undefined);
    try {
      const hash = await writeContractAsync({
        ...predictionMarketConfig,
        functionName: "claimWinnings",
        args: [marketId],
      });
      setPendingHash(hash);
      return hash;
    } catch (e: unknown) {
      if (!isUserRejection(e)) {
        const msg = e instanceof Error ? e.message : "Transaction failed";
        setError(mapTradingError(msg));
      }
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  };

  const approve = async (amount: bigint) => {
    setIsSubmitting(true);
    try {
      const hash = await writeContractAsync({
        ...mockUsdcConfig,
        functionName: "approve",
        args: [MARKET_ADDRESS, amount],
      });
      return hash;
    } catch (e: unknown) {
      if (!isUserRejection(e)) {
        const msg = e instanceof Error ? e.message : "Approval failed";
        setError(mapTradingError(msg));
      }
      throw e;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    buyShares,
    sellShares,
    claimWinnings,
    approve,
    isSubmitting,
    isConfirming,
    pendingHash,
    error,
  };
}
