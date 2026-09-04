import { PageHeaderSkeleton, SkeletonBlock } from "@/components/skeleton";

export default function TrendsLoading() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <PageHeaderSkeleton eyebrowWidth="w-20" />
      <div className="divider -mt-4" />

      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-7 w-20 !rounded-full" />
        ))}
      </div>

      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-7 w-12 !rounded-full" />
        ))}
      </div>

      <div className="card p-4">
        <SkeletonBlock className="h-56 w-full !rounded-2xl" />
      </div>
    </main>
  );
}
