"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { clsx } from "clsx";

type ToastType = "success" | "error" | "info" | "pending";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  txHash?: string;
}

interface ToastContextValue {
  addToast: (msg: string, type?: ToastType, txHash?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const typeClasses: Record<ToastType, string> = {
  success: "border-yes/50 bg-yes-muted/20",
  error:   "border-no/50  bg-no-muted/20",
  info:    "border-accent/50 bg-navy-800",
  pending: "border-accent/50 bg-navy-800",
};

const typeIcons: Record<ToastType, string> = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
  pending: "⟳",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info", txHash?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type, txHash }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, type === "pending" ? 30_000 : 5_000);
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "flex items-start gap-3 p-3 rounded-lg border text-sm shadow-lg",
              typeClasses[t.type],
              t.type === "pending" && "animate-pulse"
            )}
          >
            <span className={clsx("text-base font-bold mt-0.5", t.type === "success" ? "text-yes" : t.type === "error" ? "text-no" : "text-accent")}>
              {typeIcons[t.type]}
            </span>
            <div className="flex-1">
              <p className="text-white">{t.message}</p>
              {t.txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${t.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-dim hover:text-accent text-xs underline"
                >
                  View on Etherscan ↗
                </a>
              )}
            </div>
            <button onClick={() => remove(t.id)} className="text-accent-dim hover:text-white ml-1">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
