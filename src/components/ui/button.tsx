import { ButtonHTMLAttributes, forwardRef } from "react";

const variants = {
  default: "bg-brand text-brand-foreground hover:bg-brand/90",
  destructive: "bg-destructive text-white hover:bg-destructive/90",
  outline: "border border-border bg-transparent hover:bg-zinc-50",
  ghost: "hover:bg-zinc-100",
  link: "text-brand underline-offset-4 hover:underline",
} as const;

const sizes = {
  sm: "h-8 px-3 text-xs rounded-md",
  default: "h-10 px-4 py-2 text-sm rounded-md",
  lg: "h-12 px-6 rounded-lg text-base",
  icon: "h-10 w-10",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  ),
);
Button.displayName = "Button";
