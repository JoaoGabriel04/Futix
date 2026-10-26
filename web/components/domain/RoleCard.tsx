"use client";

import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

interface RoleCardProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function RoleCard({ icon: Icon, label, description, selected, onClick, disabled }: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex items-center gap-[var(--space-md)] p-[var(--space-lg)] rounded-[var(--radius-md)] w-full text-left transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        selected
          ? "border-2 border-accent-default bg-accent-subtle"
          : "border-2 border-border-default bg-bg-surface hover:border-border-strong",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Icon container */}
      <span
        className={[
          "flex items-center justify-center size-12 rounded-full shrink-0",
          selected ? "bg-accent-default" : "bg-bg-raised",
        ].join(" ")}
      >
        <Icon
          size={22}
          className={selected ? "text-text-on-accent" : "text-text-muted"}
          aria-hidden
        />
      </span>

      {/* Text */}
      <div className="flex flex-col flex-1 min-w-0">
        <p
          className={[
            "text-body-strong",
            selected ? "text-accent-default" : "text-text-primary",
          ].join(" ")}
        >
          {label}
        </p>
        {description && (
          <p className="text-caption-regular text-text-muted mt-[2px]">{description}</p>
        )}
      </div>

      {/* Selection indicator */}
      <span
        className={[
          "size-5 rounded-full border-2 shrink-0 flex items-center justify-center",
          selected
            ? "border-accent-default bg-accent-default"
            : "border-border-default bg-transparent",
        ].join(" ")}
      >
        {selected && <Check size={10} className="text-text-on-accent" aria-hidden />}
      </span>
    </button>
  );
}
