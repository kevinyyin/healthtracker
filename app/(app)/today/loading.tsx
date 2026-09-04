import { DEFAULT_WIDGET_KEYS } from "@/lib/dashboard-widgets";
import { SkeletonBlock } from "@/components/skeleton";

export default function TodayLoading() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="h-8 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-9 w-20 !rounded-full" />
          <SkeletonBlock className="h-9 w-28 !rounded-full" />
        </div>
      </div>
      <div className="divider -mt-4" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {DEFAULT_WIDGET_KEYS.map((key) => (
          <div key={key} className="card flex aspect-square items-center justify-center p-4">
            <SkeletonBlock className="h-20 w-20 !rounded-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
