export function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card h-full p-4" role="group" aria-label={`${label}: ${value}${sub ? `, ${sub}` : ""}`}>
      <div aria-hidden="true">
        <p className="eyebrow">{label}</p>
        <p className="figure mt-1 text-3xl font-semibold">{value}</p>
        {sub && <p className="mt-1 text-xs text-foreground/70">{sub}</p>}
      </div>
    </div>
  );
}
