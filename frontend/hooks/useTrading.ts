"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useWriteContract, useAccount, useWaitForTransactionReceipt } from "wagmi";
import { predictionMarketConfig, mockUsdcConfig } from "@/lib/contracts";
import { MARKET_ADDRESS } from "@/constants";
import { useState } from "react";

export function useTrading(marketId: bigint) {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();

  const [pendingHash, setPendingHash] = useState<`0x${string}` | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: pendingHash,
    query: {
      enabled: !!pendingHash,
    },
  });

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
      // Invalidate queries after submission (not waiting for confirmation)
      setTimeout(() => {
        queryClient.invalidateQueries();
      }, 2000);
      return hash;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setError(msg.includes("User rejected") ? "Transaction rejected" : "Transaction failed");
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
      setTimeout(() => {
        queryClient.invalidateQueries();
      }, 2000);
      return hash;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setError(msg.includes("User rejected") ? "Transaction rejected" : "Transaction failed");
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
      setTimeout(() => {
        queryClient.invalidateQueries();
      }, 2000);
      return hash;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setError(msg.includes("User rejected") ? "Transaction rejected" : "Transaction failed");
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
      setTimeout(() => queryClient.invalidateQueries(), 2000);
      return hash;
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
