import type { ButtonHTMLAttributes } from "react";

type Variant = "Primary" | "Secondary" | "Ghost" | "Danger";
type Size = "Large" | "Small";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClass: Record<Variant, string> = {
  Primary: "bg-accent-default text-text-on-accent",
  Secondary: "bg-bg-raised border border-border-default text-text-primary",
  Ghost: "text-accent-default",
  Danger: "bg-status-danger-subtle text-status-danger",
};

const sizeClass: Record<Size, string> = {
  Large: "h-[52px] px-[var(--space-xl)] rounded-md text-body-strong",
  Small: "h-[36px] px-[var(--space-lg)] rounded-sm text-caption-strong",
};

export function Button({
  variant = "Primary",
  size = "Large",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-[var(--space-sm)] font-semibold",
        "transition-opacity disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed",
        variantClass[variant],
        sizeClass[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
