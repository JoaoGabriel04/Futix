"use client";

interface SegmentedControlProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div
      className={[
        "bg-bg-raised rounded-md p-[4px] gap-[var(--space-xs)] flex",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={[
            "flex-1 py-[10px] rounded-sm flex items-center justify-center text-caption-strong transition-colors",
            value === option.value
              ? "bg-accent-default text-text-on-accent"
              : "text-text-secondary",
          ].join(" ")}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
