import { SkeletonMatchCard, SkeletonText } from "../../../components/ui/Skeleton";

export default function InicioLoading() {
  return (
    <div className="w-full max-w-2xl mx-auto lg:max-w-none p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-lg)]">
      {/* Header */}
      <div className="flex flex-col gap-[var(--space-xs)] lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-[var(--space-xs)]">
          <SkeletonText className="h-[14px] w-[130px]" />
          <SkeletonText className="h-[34px] w-[190px]" />
        </div>
      </div>

      {/* Hero card placeholder */}
      <div
        className="skeleton-shimmer rounded-[var(--radius-lg)] h-[140px] lg:h-[104px]"
        aria-hidden="true"
      />

      {/* Section label row */}
      <div className="flex items-center justify-between">
        <SkeletonText className="h-[22px] w-[110px]" />
        <SkeletonText className="h-[16px] w-[60px]" />
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-[var(--space-lg)] lg:grid lg:grid-cols-3">
        <SkeletonMatchCard />
        <SkeletonMatchCard />
        <SkeletonMatchCard />
      </div>
    </div>
  );
}
