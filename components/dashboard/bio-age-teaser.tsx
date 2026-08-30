import Link from "next/link";
import type { BiologicalAgeResult } from "@/lib/analytics/biological-age";

export function BioAgeTeaser({ result }: { result: BiologicalAgeResult | null }) {
  const label =
    result == null
      ? "Add your profile to see this"
      : result.bioAge == null
        ? `Building your baseline: ${result.nightsUsed}/7 nights`
        : `${result.bioAge.toFixed(0)} vs your age of ${result.chronoAge}`;

  return (
    <Link
      href={result == null ? "/settings" : "/biological-age"}
      className="card card-interactive group flex h-full items-center justify-between p-4"
    >
      <div>
        <p className="eyebrow">Biological Age</p>
        <p className="mt-1 text-sm font-medium">{label}</p>
      </div>
      <span className="shrink-0 text-foreground/40 transition-transform duration-300 group-hover:translate-x-0.5">
        &rarr;
      </span>
    </Link>
  );
}
