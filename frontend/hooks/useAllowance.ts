"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { mockUsdcConfig, predictionMarketConfig } from "@/lib/contracts";
import { MARKET_ADDRESS } from "@/constants";

export function useAllowance() {
  const { address } = useAccount();

  const { data: allowance, refetch } = useReadContract({
    ...mockUsdcConfig,
    functionName: "allowance",
    args: [address!, MARKET_ADDRESS],
    query: { enabled: !!address },
  });

  const { writeContractAsync, isPending } = useWriteContract();

  const approve = async (amount: bigint) => {
    const hash = await writeContractAsync({
      ...mockUsdcConfig,
      functionName: "approve",
      args: [MARKET_ADDRESS, amount],
    });
    return hash;
  };

  const needsApproval = (amount: bigint): boolean => {
    return (allowance ?? 0n) < amount;
  };

  return { allowance: allowance ?? 0n, approve, needsApproval, isPending, refetch };
}
