export function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="h-full rounded border border-black/[.08] p-4 dark:border-white/[.145]">
      <p className="text-sm text-foreground/60">{label}</p>
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-foreground/50">{sub}</p>}
    </div>
  );
}
