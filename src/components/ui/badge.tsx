import { HTMLAttributes, forwardRef } from "react";

const variants = {
  default: "bg-brand/10 text-brand",
  destructive: "bg-destructive/10 text-destructive",
  outline: "border border-border text-foreground",
  secondary: "bg-zinc-100 text-zinc-800",
} as const;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = "", variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${variants[variant]} ${className}`}
      {...props}
    />
  ),
);
Badge.displayName = "Badge";
