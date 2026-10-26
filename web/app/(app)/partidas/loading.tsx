import { SkeletonMatchCard, SkeletonText } from "../../../components/ui/Skeleton";

export default function PartidasLoading() {
  return (
    <div className="w-full max-w-2xl mx-auto p-[var(--space-lg)] lg:p-[var(--space-3xl)] flex flex-col gap-[var(--space-lg)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-[var(--space-md)]">
        <SkeletonText className="h-[28px] w-[110px]" />
        <div className="skeleton-shimmer h-[36px] w-[100px] rounded-[var(--radius-md)]" aria-hidden="true" />
      </div>

      {/* Room cards */}
      <div className="flex flex-col gap-[var(--space-lg)]">
        <SkeletonMatchCard />
        <SkeletonMatchCard />
        <SkeletonMatchCard />
        <SkeletonMatchCard />
      </div>
    </div>
  );
}
