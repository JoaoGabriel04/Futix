"use client";

import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

interface RoleCardProps {
  icon: LucideIcon;
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function RoleCard({ icon: Icon, label, selected, onClick, disabled }: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "relative flex flex-col gap-[var(--space-md)] p-[var(--space-lg)] rounded-lg w-full text-left transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        selected
          ? "border-2 border-accent-default bg-accent-subtle"
          : "border-2 border-border-default bg-bg-surface hover:border-border-strong",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {selected && (
        <span className="absolute top-[var(--space-sm)] right-[var(--space-sm)] flex items-center justify-center size-5 rounded-full bg-accent-default">
          <Check size={12} className="text-text-on-accent" aria-hidden />
        </span>
      )}

      <span
        className={[
          "flex items-center justify-center size-10 rounded-full",
          selected ? "bg-accent-subtle" : "bg-bg-raised",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Icon
          size={20}
          className={selected ? "text-accent-default" : "text-text-muted"}
          aria-hidden
        />
      </span>

      <p
        className={[
          "text-body-strong",
          selected ? "text-accent-default" : "text-text-primary",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {label}
      </p>
    </button>
  );
}
