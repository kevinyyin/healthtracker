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
      className="flex h-full items-center justify-between rounded border border-black/[.08] p-4 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:hover:bg-white/[.04]"
    >
      <div>
        <p className="text-sm text-foreground/60">Biological Age</p>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <span className="text-foreground/40">&rarr;</span>
    </Link>
  );
}
