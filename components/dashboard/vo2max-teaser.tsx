import Link from "next/link";
import type { Vo2MaxResult } from "@/lib/analytics/vo2max";

export function Vo2MaxTeaser({ result }: { result: Vo2MaxResult | null }) {
  return (
    <Link
      href={result == null ? "/settings" : "/cardio-fitness"}
      className="card card-interactive group flex h-full items-center justify-between p-4"
    >
      <div>
        <p className="eyebrow">Cardio Fitness</p>
        {result == null ? (
          <p className="mt-1 text-sm font-medium">Add your profile to see this</p>
        ) : result.vo2max == null ? (
          <p className="mt-1 text-sm font-medium">Building your baseline: {result.nightsUsed}/7 nights</p>
        ) : (
          <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
            <span className="figure text-xl font-semibold">{result.vo2max.toFixed(0)}</span>
            <span className="text-sm text-foreground/70">
              ml/kg/min <span className="text-foreground/50">(estimate)</span>
            </span>
          </p>
        )}
      </div>
      <span
        aria-hidden="true"
        className="shrink-0 text-foreground/55 transition-transform duration-300 group-hover:translate-x-0.5"
      >
        &rarr;
      </span>
    </Link>
  );
}
