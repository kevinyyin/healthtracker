import { recommendTargetStrain } from "@/lib/analytics/day-strain";

export function WorkoutRecommender({ recovery }: { recovery: number | null }) {
  const target = recommendTargetStrain(recovery);

  return (
    <div
      className="card h-full p-4"
      role="group"
      aria-label={`Target Strain: ${target.min.toFixed(1)} to ${target.max.toFixed(1)}, ${target.label}`}
    >
      <div aria-hidden="true">
        <p className="eyebrow">Target Strain</p>
        <p className="figure mt-1 text-2xl font-semibold">
          {target.min.toFixed(1)}-{target.max.toFixed(1)}
        </p>
        <p className="text-sm text-foreground/70">{target.label}</p>
      </div>
    </div>
  );
}
