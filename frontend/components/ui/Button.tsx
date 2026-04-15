"use client";

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "yes" | "no" | "ghost" | "outline";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-accent text-navy hover:bg-accent-dim font-semibold",
  yes:     "bg-yes text-white hover:bg-yes-muted font-semibold",
  no:      "bg-no  text-white hover:bg-no-muted  font-semibold",
  ghost:   "bg-transparent text-accent hover:bg-navy-800",
  outline: "bg-transparent border border-accent-dim text-accent hover:bg-navy-800",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2   text-sm",
  lg: "px-6 py-3   text-base",
};

export function Button({
  variant = "primary",
  size    = "md",
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center gap-2 rounded-lg transition-colors duration-150",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )
      )}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
