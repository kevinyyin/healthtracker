import Link from "next/link";

export function MetricCard({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const readout = (
    <>
      <p className="eyebrow">{label}</p>
      <p className="figure mt-1 text-3xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs text-foreground/70">{sub}</p>}
    </>
  );

  if (href) {
    // No role="group"/aria-label override here, unlike the static card below — as a real
    // link its accessible name comes from its own visible text, so a "-" empty state reads
    // as "Sleep" (label) rather than being literally vocalized as "hyphen".
    return (
      <Link href={href} className="card card-interactive group relative block h-full p-4">
        {readout}
        <span
          aria-hidden="true"
          className="absolute right-4 top-4 text-foreground/40 transition-transform duration-300 group-hover:translate-x-0.5"
        >
          &rarr;
        </span>
      </Link>
    );
  }

  return (
    <div className="card h-full p-4" role="group" aria-label={`${label}: ${value}${sub ? `, ${sub}` : ""}`}>
      <div aria-hidden="true">{readout}</div>
    </div>
  );
}
