import { SkeletonText, SkeletonPlayerRow } from "../../../../components/ui/Skeleton";

export default function SalaLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-lg)]">
        {/* Header: ← Sala share */}
        <div className="flex items-center gap-[var(--space-md)]">
          <div className="skeleton-shimmer size-[20px] rounded-full shrink-0" aria-hidden="true" />
          <SkeletonText className="h-[24px] w-[50px] flex-1" />
          <div className="skeleton-shimmer size-[20px] rounded-full shrink-0" aria-hidden="true" />
        </div>

        {/* Room title + badge */}
        <div className="flex items-center gap-[var(--space-sm)]">
          <SkeletonText className="h-[28px] w-[65%]" />
          <div className="skeleton-shimmer h-[24px] w-[80px] rounded-full shrink-0" aria-hidden="true" />
        </div>

        {/* 4 detail lines */}
        <div className="flex flex-col gap-[var(--space-sm)]">
          <SkeletonText className="h-[20px] w-[55%]" />
          <SkeletonText className="h-[20px] w-[45%]" />
          <SkeletonText className="h-[20px] w-[65%]" />
          <SkeletonText className="h-[20px] w-[50%]" />
        </div>

        {/* Progress bar */}
        <div className="skeleton-shimmer h-[6px] w-full rounded-full" aria-hidden="true" />

        {/* SegmentedControl placeholder */}
        <div className="skeleton-shimmer h-[40px] w-full rounded-[var(--radius-md)]" aria-hidden="true" />

        {/* Player list */}
        <div className="bg-bg-surface border border-border-default rounded-[var(--radius-md)] divide-y divide-border-default overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="px-[var(--space-md)]">
              <SkeletonPlayerRow />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
