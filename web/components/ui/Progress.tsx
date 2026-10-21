interface ProgressProps {
  value: number; // 0–100
  className?: string;
}

export function Progress({ value, className }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={["bg-bg-raised h-[6px] rounded-full overflow-hidden", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="bg-accent-default h-full rounded-full transition-[width]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
