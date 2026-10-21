"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, className, ...props }, ref) => {
    const inputId =
      id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

    return (
      <div className={["flex flex-col gap-[var(--space-sm)]", className].filter(Boolean).join(" ")}>
        {label && (
          <label htmlFor={inputId} className="text-caption-strong text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className="bg-bg-surface h-[52px] w-full px-[var(--space-lg)] rounded-md border border-border-default text-body-regular text-text-primary placeholder:text-text-muted outline-none focus:border-2 focus:border-accent-default"
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = "Input";
