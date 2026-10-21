"use client";

import { Minus, Plus } from "lucide-react";

interface StepperRowProps {
  titulo: string;
  dica?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  className?: string;
}

export function StepperRow({
  titulo,
  dica,
  value,
  min = 1,
  max = 99,
  onChange,
  className,
}: StepperRowProps) {
  const decrement = () => { if (value > min) onChange(value - 1); };
  const increment = () => { if (value < max) onChange(value + 1); };

  return (
    <div
      className={[
        "bg-bg-surface border border-border-default rounded-lg",
        "flex gap-[var(--space-md)] items-center px-[var(--space-lg)] py-[var(--space-md)] w-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Label */}
      <div className="flex flex-col gap-[var(--space-xs)] min-w-0 flex-1">
        <p className="text-body-strong text-text-primary">{titulo}</p>
        {dica && <p className="text-caption-regular text-text-muted">{dica}</p>}
      </div>

      {/* Controles */}
      <div className="flex gap-[var(--space-sm)] items-center shrink-0">
        <button
          type="button"
          aria-label={`Diminuir ${titulo}`}
          disabled={value <= min}
          onClick={decrement}
          className="size-9 rounded-full bg-bg-raised border border-border-default flex items-center justify-center transition-opacity disabled:opacity-40"
        >
          <Minus size={16} aria-hidden />
        </button>

        <span className="text-heading-h3 text-text-primary text-center w-7 tabular-nums">
          {value}
        </span>

        <button
          type="button"
          aria-label={`Aumentar ${titulo}`}
          disabled={value >= max}
          onClick={increment}
          className="size-9 rounded-full bg-accent-default flex items-center justify-center transition-opacity disabled:opacity-40"
        >
          <Plus size={16} className="text-text-on-accent" aria-hidden />
        </button>
      </div>
    </div>
  );
}
