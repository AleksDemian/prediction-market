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
  primary: "bg-brand text-navy hover:bg-brand-light font-semibold",
  yes:     "bg-yes text-navy hover:bg-yes-muted hover:text-white font-semibold",
  no:      "bg-no  text-navy hover:bg-no-muted hover:text-white font-semibold",
  ghost:   "bg-brand-ghost text-brand border border-brand/30 hover:bg-brand/20",
  outline: "bg-transparent border border-border text-text-secondary hover:text-text-primary hover:border-border-light",
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
