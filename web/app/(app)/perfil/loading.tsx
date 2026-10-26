import { SkeletonText } from "../../../components/ui/Skeleton";

export default function PerfilLoading() {
  return (
    <div className="w-full">
      {/* Mobile */}
      <div className="lg:hidden flex flex-col pt-[var(--space-xl)] pb-[var(--space-2xl)] px-[var(--space-lg)] gap-[var(--space-lg)]">
        {/* Hero card */}
        <div className="bg-bg-surface border border-border-default rounded-[var(--radius-xl)] px-[var(--space-lg)] py-[var(--space-xl)] flex flex-col gap-[var(--space-lg)] items-center">
          <div className="skeleton-shimmer size-[96px] rounded-full" aria-hidden="true" />
          <SkeletonText className="h-[28px] w-[150px]" />
          <SkeletonText className="h-[20px] w-[90px]" />
          <div className="flex gap-[var(--space-sm)]">
            <div className="skeleton-shimmer h-[30px] w-[70px] rounded-full" aria-hidden="true" />
            <div className="skeleton-shimmer h-[30px] w-[115px] rounded-full" aria-hidden="true" />
          </div>
          <div className="flex gap-[var(--space-md)] w-full">
            <div className="skeleton-shimmer h-[36px] flex-1 rounded-[var(--radius-md)]" aria-hidden="true" />
            <div className="skeleton-shimmer h-[36px] flex-1 rounded-[var(--radius-md)]" aria-hidden="true" />
          </div>
        </div>

        {/* Section label */}
        <SkeletonText className="h-[12px] w-[110px]" />

        {/* Data rows */}
        <div className="bg-bg-surface border border-border-default rounded-[var(--radius-lg)] px-[var(--space-lg)] py-[var(--space-sm)]">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex gap-[var(--space-md)] items-center py-[var(--space-md)] border-b last:border-b-0 border-border-default"
            >
              <div className="skeleton-shimmer size-[18px] rounded-[var(--radius-sm)] shrink-0" aria-hidden="true" />
              <div className="flex flex-col gap-[var(--space-xs)] flex-1">
                <SkeletonText className="h-[12px] w-[55px]" />
                <SkeletonText className="h-[20px] w-[140px]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex flex-col px-[48px] py-[40px] gap-[var(--space-xl)] flex-1">
        <SkeletonText className="h-[28px] w-[160px]" />
        <div className="skeleton-shimmer h-[220px] w-full rounded-[var(--radius-lg)]" aria-hidden="true" />
      </div>
    </div>
  );
}
