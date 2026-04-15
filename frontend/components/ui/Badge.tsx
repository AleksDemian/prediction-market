import { ReactNode } from "react";
import { clsx } from "clsx";

type BadgeVariant = "open" | "closed" | "resolved-yes" | "resolved-no" | "demo" | "default";

const variantClasses: Record<BadgeVariant, string> = {
  "open":         "bg-yes-muted text-yes border border-yes/30",
  "closed":       "bg-navy-800 text-accent-dim border border-accent-dim/30",
  "resolved-yes": "bg-yes-muted text-yes border border-yes/30",
  "resolved-no":  "bg-no-muted  text-no  border border-no/30",
  "demo":         "bg-accent/10 text-accent border border-accent/30",
  "default":      "bg-navy-800 text-accent border border-accent-dim/30",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

export function Badge({ variant = "default", children }: BadgeProps) {
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", variantClasses[variant])}>
      {children}
    </span>
  );
}
