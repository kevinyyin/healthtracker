import { recommendTargetStrain } from "@/lib/analytics/day-strain";

export function WorkoutRecommender({ recovery }: { recovery: number | null }) {
  const target = recommendTargetStrain(recovery);

  return (
    <div
      className="card h-full p-4"
      role="group"
      aria-label={`Target Strain: ${Math.round(target.min)} to ${Math.round(target.max)}, ${target.label}`}
    >
      <div aria-hidden="true">
        <p className="eyebrow">Target Strain</p>
        <p className="figure mt-1 text-2xl font-semibold">
          {Math.round(target.min)}-{Math.round(target.max)}
        </p>
        <p className="text-sm text-foreground/70">{target.label}</p>
      </div>
    </div>
  );
}
