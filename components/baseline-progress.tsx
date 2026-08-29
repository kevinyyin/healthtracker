export function BaselineProgress({ label, have, need }: { label: string; have: number; need: number }) {
  const pct = Math.min(100, (have / need) * 100);

  return (
    <div className="flex flex-col gap-2 rounded border border-dashed border-black/[.12] p-4 dark:border-white/[.15]">
      <p className="text-sm text-foreground/60">{label}</p>
      <p className="text-sm font-medium">
        Building your baseline: {have} of {need} days
      </p>
      <div className="h-1.5 w-full rounded-full bg-black/[.08] dark:bg-white/[.12]">
        <div className="h-1.5 rounded-full bg-foreground/60" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
