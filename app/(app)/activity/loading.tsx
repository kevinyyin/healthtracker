import { PageHeaderSkeleton, SkeletonBlock } from "@/components/skeleton";

export default function ActivityLoading() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <PageHeaderSkeleton eyebrowWidth="w-20" />
      <div className="divider -mt-4" />

      <ul className="flex flex-col divide-y divide-[var(--border)]">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-center justify-between py-3">
            <div className="flex flex-col gap-2">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-3 w-32" />
              <SkeletonBlock className="h-3 w-40" />
            </div>
            <SkeletonBlock className="h-5 w-12" />
          </li>
        ))}
      </ul>
    </main>
  );
}
