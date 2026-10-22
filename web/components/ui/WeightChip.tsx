"use client";

type WeightLevel = "REGULAR" | "GOOD" | "STAR";

interface WeightChipProps {
  level: WeightLevel;
  className?: string;
}

const levelVariant: Record<WeightLevel, string> = {
  REGULAR: "bg-bg-raised border border-border-default text-text-secondary",
  GOOD: "bg-bg-raised border border-border-strong text-text-primary",
  STAR: "bg-accent-default border border-accent-default text-text-on-accent",
};

const levelLabel: Record<WeightLevel, string> = {
  REGULAR: "Regular",
  GOOD: "Bom",
  STAR: "Craque",
};

export function WeightChip({ level, className }: WeightChipProps) {
  return (
    <span
      className={[
        "rounded-full px-[var(--space-sm)] py-[2px] text-caption-strong",
        levelVariant[level],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {levelLabel[level]}
    </span>
  );
}
