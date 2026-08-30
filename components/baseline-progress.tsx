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
        <div className="h-1 w-full rounded-full bg-[var(--border)]">
          <div className="h-1 rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-foreground/70">
          {have} of {need} days
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[1.25rem] border border-dashed border-[var(--border)] p-4">
      <p className="eyebrow">{label}</p>
      <p className="text-sm font-medium">
        Building your baseline: {have} of {need} days
      </p>
      <div className="h-1.5 w-full rounded-full bg-[var(--border)]">
        <div className="h-1.5 rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
