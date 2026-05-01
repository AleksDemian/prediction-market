"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { predictionMarketConfig } from "@/lib/contracts";
import { useAllowance } from "@/hooks/useAllowance";
import { usePollAfterAdminTx } from "@/hooks/useMarketSync";

interface CreateMarketInput {
  question: string;
  category: string;
  closingTime: bigint;
  resolutionTime: bigint;
  initialLiquidity: bigint;
}

function isUserRejection(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return msg.includes("user rejected") || msg.includes("user denied");
}

export function useCreateMarket() {
  const pollAfterAdminTx = usePollAfterAdminTx();
  const pendingCreateRef = useRef<CreateMarketInput | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [lastCreatedQuestion, setLastCreatedQuestion] = useState<string | null>(null);

  const { needsApproval, approve, refetch: refetchAllowance } = useAllowance();

  const {
    writeContractAsync,
    data: hash,
    isPending,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  useEffect(() => {
    if (!isSuccess || !pendingCreateRef.current) return;
    setLastCreatedQuestion(pendingCreateRef.current.question);
    pendingCreateRef.current = null;
    pollAfterAdminTx();
  }, [isSuccess, pollAfterAdminTx]);

  const createMarket = useCallback(
    async (input: CreateMarketInput) => {
      setError(undefined);
      setLastCreatedQuestion(null);
      pendingCreateRef.current = input;

      try {
        if (needsApproval(input.initialLiquidity)) {
          setIsApproving(true);
          await approve(input.initialLiquidity);
          await refetchAllowance();
        }

        const createHash = await writeContractAsync({
          ...predictionMarketConfig,
          functionName: "createMarket",
          args: [
            input.question,
            input.category,
            input.closingTime,
            input.resolutionTime,
            input.initialLiquidity,
          ],
        });

        return createHash;
      } catch (e: unknown) {
        if (isUserRejection(e)) {
          setError("Транзакцію скасовано користувачем");
        } else {
          const message = e instanceof Error ? e.message : "Не вдалося створити маркет";
          setError(message);
        }
        pendingCreateRef.current = null;
        throw e;
      } finally {
        setIsApproving(false);
      }
    },
    [approve, needsApproval, refetchAllowance, writeContractAsync]
  );

  return {
    createMarket,
    hash,
    isApproving,
    isPending,
    isConfirming,
    isSuccess,
    error,
    lastCreatedQuestion,
  };
}
