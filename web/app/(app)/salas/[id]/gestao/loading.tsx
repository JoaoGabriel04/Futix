import { SkeletonText, SkeletonApprovalCard } from "../../../../../components/ui/Skeleton";

export default function GestaoLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto lg:max-w-none p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-lg)]">
          {/* Header */}
          <div className="flex items-center gap-[var(--space-md)]">
            <div className="skeleton-shimmer size-[20px] rounded-full shrink-0" aria-hidden="true" />
            <div className="flex flex-col gap-[var(--space-xs)] flex-1 min-w-0">
              <SkeletonText className="h-[22px] w-[140px]" />
              <SkeletonText className="h-[14px] w-[110px]" />
            </div>
          </div>

          {/* Stats grid (3 cols) */}
          <div className="grid grid-cols-3 gap-[var(--space-sm)]">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="skeleton-shimmer rounded-[var(--radius-md)] h-[68px]"
                aria-hidden="true"
              />
            ))}
          </div>

          {/* SegmentedControl placeholder */}
          <div className="skeleton-shimmer h-[40px] w-full rounded-[var(--radius-md)]" aria-hidden="true" />

          {/* Section label */}
          <SkeletonText className="h-[22px] w-[160px]" />

          {/* ApprovalCards */}
          <SkeletonApprovalCard />
          <SkeletonApprovalCard />
          <SkeletonApprovalCard />
        </div>
      </div>
    </div>
  );
}
