import { PageHeaderSkeleton, SkeletonBlock } from "@/components/skeleton";

export default function SettingsLoading() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <PageHeaderSkeleton eyebrowWidth="w-16" />
      <div className="divider -mt-4" />

      {Array.from({ length: 4 }).map((_, i) => (
        <section key={i} className="card flex flex-col gap-3 p-4">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-2/3" />
        </section>
      ))}
    </main>
  );
}
