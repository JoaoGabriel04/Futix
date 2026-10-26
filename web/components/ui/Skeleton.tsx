import type { CSSProperties } from "react";

interface SkeletonBaseProps {
  className?: string;
  style?: CSSProperties;
}

function Block({ className = "", style }: SkeletonBaseProps) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer rounded-[var(--radius-sm)] ${className}`}
      style={style}
    />
  );
}

export function SkeletonText({ className }: SkeletonBaseProps) {
  return <Block className={`h-[18px] ${className ?? "w-full"}`} />;
}

export function SkeletonAvatar({ size = "MD" }: { size?: "SM" | "MD" | "LG" }) {
  const dim = size === "LG" ? "size-[88px]" : size === "SM" ? "size-8" : "size-10";
  return <Block className={`${dim} rounded-full`} />;
}

export function SkeletonMatchCard({ className }: SkeletonBaseProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        "bg-bg-surface border border-border-default rounded-[var(--radius-lg)]",
        "flex flex-col gap-[var(--space-md)] p-[var(--space-lg)] w-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* header */}
      <div className="flex items-start justify-between gap-[var(--space-md)]">
        <div className="flex flex-col gap-[var(--space-xs)] flex-1">
          <Block className="h-[22px] w-[60%]" />
          <Block className="h-[18px] w-[40%]" />
        </div>
        <Block className="h-[24px] w-[70px] rounded-full" />
      </div>
      {/* details row */}
      <div className="flex gap-[var(--space-xl)]">
        <Block className="h-[18px] w-[100px]" />
        <Block className="h-[18px] w-[80px]" />
      </div>
      {/* progress */}
      <Block className="h-[6px] w-full rounded-full" />
    </div>
  );
}

export function SkeletonPlayerRow({ className }: SkeletonBaseProps) {
  return (
    <div
      aria-hidden="true"
      className={`flex gap-[var(--space-md)] items-center py-[var(--space-sm)] ${className ?? ""}`}
    >
      <SkeletonAvatar size="MD" />
      <div className="flex flex-col gap-[var(--space-xs)] flex-1 min-w-0">
        <Block className="h-[22px] w-[50%]" />
        <Block className="h-[18px] w-[30%]" />
      </div>
      <Block className="h-[24px] w-[70px] rounded-full" />
    </div>
  );
}

export function SkeletonStatBlock({ className }: SkeletonBaseProps) {
  return (
    <div aria-hidden="true" className={`flex flex-col gap-[var(--space-xs)] ${className ?? ""}`}>
      <Block className="h-[28px] w-[48px]" />
      <Block className="h-[18px] w-[64px]" />
    </div>
  );
}

export function SkeletonApprovalCard({ className }: SkeletonBaseProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        "bg-bg-surface border border-border-default rounded-[var(--radius-lg)]",
        "flex flex-col gap-[var(--space-lg)] p-[var(--space-lg)] w-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex gap-[var(--space-md)] items-start">
        <Block className="size-10 rounded-full" />
        <div className="flex flex-col gap-[var(--space-xs)] flex-1 min-w-0">
          <Block className="h-[22px] w-[60%]" />
          <Block className="h-[18px] w-[40%]" />
        </div>
        <Block className="h-[24px] w-[60px] rounded-full" />
      </div>
      <div className="flex gap-[var(--space-md)]">
        <Block className="h-[36px] flex-1 rounded-[var(--radius-md)]" />
        <Block className="h-[36px] flex-1 rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}
