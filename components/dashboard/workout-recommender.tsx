import { recommendTargetStrain } from "@/lib/analytics/day-strain";

export function WorkoutRecommender({ recovery }: { recovery: number | null }) {
  const target = recommendTargetStrain(recovery);

  return (
    <div className="card h-full p-4">
      <p className="eyebrow">Target Strain</p>
      <p className="figure mt-1 text-2xl font-semibold">
        {target.min.toFixed(1)}-{target.max.toFixed(1)}
      </p>
      <p className="text-sm text-foreground/60">{target.label}</p>
    </div>
  );
}
