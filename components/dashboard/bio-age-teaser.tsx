import Link from "next/link";
import type { BiologicalAgeResult } from "@/lib/analytics/biological-age";

export function BioAgeTeaser({ result }: { result: BiologicalAgeResult | null }) {
  return (
    <Link
      href={result == null ? "/settings" : "/biological-age"}
      className="card card-interactive group flex h-full items-center justify-between p-4"
    >
      <div>
        <p className="eyebrow">Biological Age</p>
        {/* The headline reading gets the same tabular .figure treatment as every other
            metric on the dashboard, once it exists — a sentence-only caption otherwise. */}
        {result == null ? (
          <p className="mt-1 text-sm font-medium">Add your profile to see this</p>
        ) : result.bioAge == null ? (
          <p className="mt-1 text-sm font-medium">Building your baseline: {result.nightsUsed}/7 nights</p>
        ) : (
          <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
            <span className="figure text-xl font-semibold">{result.bioAge.toFixed(0)}</span>
            <span className="text-sm text-foreground/70">
              vs your age of <span className="figure">{result.chronoAge}</span>
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
