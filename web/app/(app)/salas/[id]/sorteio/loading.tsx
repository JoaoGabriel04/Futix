import { SkeletonText } from "../../../../../components/ui/Skeleton";

function SkeletonTeamCard() {
  return (
    <div className="bg-bg-surface border border-border-default rounded-[var(--radius-lg)] px-[var(--space-md)] py-[var(--space-lg)] flex flex-col gap-[var(--space-sm)]">
      <div className="flex items-center gap-[var(--space-sm)]">
        <SkeletonText className="h-[22px] flex-1" />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-[var(--space-sm)] items-center">
          <div className="skeleton-shimmer h-[16px] w-[50px] rounded-[var(--radius-sm)]" aria-hidden="true" />
          <SkeletonText className="h-[16px] flex-1" />
        </div>
      ))}
    </div>
  );
}

export default function SorteioLoading() {
  return (
    <div className="bg-bg-app flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-[var(--space-lg)] flex flex-col gap-[var(--space-lg)]">
        {/* Header */}
        <div className="flex items-center gap-[var(--space-md)]">
          <div className="skeleton-shimmer size-[20px] rounded-full shrink-0" aria-hidden="true" />
          <div className="flex flex-col flex-1 min-w-0 gap-[var(--space-xs)]">
            <SkeletonText className="h-[22px] w-[100px]" />
            <SkeletonText className="h-[14px] w-[140px]" />
          </div>
        </div>

        {/* Info banner */}
        <div className="skeleton-shimmer h-[52px] w-full rounded-[var(--radius-md)]" aria-hidden="true" />

        {/* Teams grid 2 cols */}
        <div className="grid grid-cols-2 gap-[var(--space-md)]">
          <SkeletonTeamCard />
          <SkeletonTeamCard />
        </div>
      </div>

      {/* Footer buttons */}
      <div className="bg-bg-sidebar border-t border-border-default pt-[12px] pb-[24px] px-[var(--space-lg)] flex gap-[var(--space-md)]">
        <div className="skeleton-shimmer h-[52px] flex-1 rounded-[var(--radius-md)]" aria-hidden="true" />
        <div className="skeleton-shimmer h-[52px] flex-1 rounded-[var(--radius-md)]" aria-hidden="true" />
      </div>
    </div>
  );
}
