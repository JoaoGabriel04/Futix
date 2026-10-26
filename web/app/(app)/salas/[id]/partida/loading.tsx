import { SkeletonText } from "../../../../../components/ui/Skeleton";

export default function PartidaLoading() {
  return (
    <div className="bg-bg-app flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-[var(--space-lg)] flex flex-col gap-[var(--space-lg)]">
        {/* Header */}
        <div className="flex items-center gap-[var(--space-md)]">
          <div className="skeleton-shimmer size-[20px] rounded-full shrink-0" aria-hidden="true" />
          <div className="flex flex-col flex-1 min-w-0 gap-[var(--space-xs)]">
            <SkeletonText className="h-[22px] w-[130px]" />
            <SkeletonText className="h-[14px] w-[100px]" />
          </div>
        </div>

        {/* Scoreboard card */}
        <div className="bg-bg-surface border border-border-default rounded-[var(--radius-lg)] p-[var(--space-lg)] flex flex-col gap-[var(--space-sm)]">
          {/* Score row */}
          <div className="flex items-center justify-center gap-[var(--space-lg)]">
            <SkeletonText className="h-[22px] w-[80px]" />
            <div className="skeleton-shimmer h-[40px] w-[90px] rounded-[var(--radius-md)]" aria-hidden="true" />
            <SkeletonText className="h-[22px] w-[80px]" />
          </div>
          {/* Timer */}
          <div className="flex justify-center">
            <SkeletonText className="h-[18px] w-[60px]" />
          </div>
        </div>

        {/* Goal history */}
        <div className="bg-bg-surface border border-border-default rounded-[var(--radius-lg)] p-[var(--space-lg)] flex flex-col gap-[var(--space-md)]">
          <SkeletonText className="h-[18px] w-[100px]" />
          {[0, 1, 2].map((i) => (
            <SkeletonText key={i} className="h-[16px] w-[70%]" />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-bg-sidebar border-t border-border-default pt-[12px] pb-[24px] px-[var(--space-lg)] flex gap-[var(--space-md)]">
        <div className="skeleton-shimmer h-[52px] flex-1 rounded-[var(--radius-md)]" aria-hidden="true" />
        <div className="skeleton-shimmer h-[52px] flex-1 rounded-[var(--radius-md)]" aria-hidden="true" />
      </div>
    </div>
  );
}
