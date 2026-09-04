import { PageHeaderSkeleton, SkeletonBlock } from "@/components/skeleton";

export default function SleepLoading() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
      <PageHeaderSkeleton eyebrowWidth="w-24" />
      <div className="divider -mt-4" />

      <div className="card flex justify-center p-6">
        <SkeletonBlock className="h-40 w-40 !rounded-full" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card flex flex-col gap-2 p-4">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-6 w-10" />
          </div>
        ))}
      </div>

      <div className="card p-4">
        <SkeletonBlock className="h-40 w-full !rounded-2xl" />
      </div>
    </main>
  );
}
