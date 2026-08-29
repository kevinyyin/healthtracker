interface BaselineProgressProps {
  label: string;
  have: number;
  need: number;
  /** Renders just the message + bar, with no border/padding, for nesting inside another card. */
  compact?: boolean;
}

export function BaselineProgress({ label, have, need, compact = false }: BaselineProgressProps) {
  const pct = Math.min(100, (have / need) * 100);

  if (compact) {
    return (
      <div className="flex w-full max-w-[140px] flex-col items-center gap-1.5">
        <div className="h-1 w-full rounded-full bg-black/[.08] dark:bg-white/[.12]">
          <div className="h-1 rounded-full bg-foreground/60" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-foreground/50">
          {have} of {need} days
        </p>
      </div>
    );
  }

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
