"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useCreateMarket } from "@/hooks/useCreateMarket";

const MIN_INITIAL_LIQUIDITY = 1_000n * 10n ** 6n;

function parseUsdc(value: string): bigint | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{0,6})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  const paddedFraction = (fraction + "000000").slice(0, 6);
  return BigInt(whole) * 10n ** 6n + BigInt(paddedFraction);
}

function toUnixSeconds(datetimeValue: string): bigint | null {
  const ms = new Date(datetimeValue).getTime();
  if (Number.isNaN(ms)) return null;
  return BigInt(Math.floor(ms / 1000));
}

export function CreateMarketCard() {
  const { isConnected } = useAccount();
  const { addToast } = useToast();
  const {
    createMarket,
    hash,
    isApproving,
    isPending,
    isConfirming,
    isSuccess,
    error,
    lastCreatedQuestion,
  } = useCreateMarket();

  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("Demo");
  const [closingTime, setClosingTime] = useState("");
  const [resolutionTime, setResolutionTime] = useState("");
  const [initialLiquidity, setInitialLiquidity] = useState("1000");

  useEffect(() => {
    if (!error) return;
    addToast(error, "error");
  }, [error, addToast]);

  useEffect(() => {
    if (!isSuccess || !lastCreatedQuestion) return;
    addToast("Market created successfully", "success");
    setQuestion("");
  }, [isSuccess, lastCreatedQuestion, addToast]);

  const validationError = useMemo(() => {
    if (!question.trim()) return "Question is required";
    if (!category.trim()) return "Category is required";

    const closing = toUnixSeconds(closingTime);
    const resolution = toUnixSeconds(resolutionTime);
    if (closing == null) return "Closing time is invalid";
    if (resolution == null) return "Resolution time is invalid";

    const now = BigInt(Math.floor(Date.now() / 1000));
    if (closing <= now) return "Closing time must be in the future";
    if (resolution < closing) return "Resolution time must be after closing time";

    const liquidity = parseUsdc(initialLiquidity);
    if (liquidity == null) return "Initial liquidity must be a valid USDC value";
    if (liquidity < MIN_INITIAL_LIQUIDITY) return "Minimum initial liquidity is 1000 mUSDC";

    return null;
  }, [category, closingTime, initialLiquidity, question, resolutionTime]);

  const busy = isApproving || isPending || isConfirming;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isConnected) {
      addToast("Connect wallet to create market", "error");
      return;
    }
    if (validationError) {
      addToast(validationError, "error");
      return;
    }

    const closing = toUnixSeconds(closingTime);
    const resolution = toUnixSeconds(resolutionTime);
    const liquidity = parseUsdc(initialLiquidity);
    if (closing == null || resolution == null || liquidity == null) return;

    try {
      await createMarket({
        question: question.trim(),
        category: category.trim(),
        closingTime: closing,
        resolutionTime: resolution,
        initialLiquidity: liquidity,
      });
    } catch {
      // Toast is shown by hook error effect.
    }
  };

  return (
    <section className="mb-8 bg-surface-card border border-border rounded-xl p-5">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
        Create market
      </h2>

      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs text-text-secondary">Question</span>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Will ETH reach $5,000 by July 2026?"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-text-secondary">Category</span>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Demo"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand"
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-text-secondary">Closing time</span>
            <input
              type="datetime-local"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-text-secondary">Resolution time</span>
            <input
              type="datetime-local"
              value={resolutionTime}
              onChange={(e) => setResolutionTime(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand"
            />
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-xs text-text-secondary">Initial liquidity (mUSDC)</span>
          <input
            type="text"
            inputMode="decimal"
            value={initialLiquidity}
            onChange={(e) => setInitialLiquidity(e.target.value)}
            placeholder="1000"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand"
          />
        </label>

        {validationError && (
          <p className="text-xs text-warning">{validationError}</p>
        )}

        <Button type="submit" disabled={!isConnected || !!validationError || busy} loading={busy}>
          {isApproving
            ? "Approving…"
            : isPending
              ? "Confirm…"
              : isConfirming
                ? "Confirming…"
                : "Create market"}
        </Button>

        {!isConnected && (
          <p className="text-xs text-text-muted text-center">
            Connect wallet to create market
          </p>
        )}

        {isSuccess && hash && (
          <a
            href={`https://sepolia.etherscan.io/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand hover:underline text-center"
          >
            View transaction ↗
          </a>
        )}
      </form>
    </section>
  );
}
