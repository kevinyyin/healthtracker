import { recommendTargetStrain } from "@/lib/analytics/day-strain";

export function WorkoutRecommender({ recovery }: { recovery: number | null }) {
  const target = recommendTargetStrain(recovery);

  return (
    <div className="rounded border border-black/[.08] p-4 dark:border-white/[.145]">
      <p className="text-sm text-foreground/60">Target Strain</p>
      <p className="text-2xl font-semibold tabular-nums">
        {target.min.toFixed(1)}–{target.max.toFixed(1)}
      </p>
      <p className="text-sm text-foreground/60">{target.label}</p>
    </div>
  );
}
