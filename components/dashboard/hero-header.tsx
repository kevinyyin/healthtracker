import type { RecoveryResult } from "@/lib/analytics/recovery-score";
import type { SleepTargetResult } from "@/lib/analytics/sleep-debt";

interface HeroHeaderProps {
  recovery: RecoveryResult;
  strain: number;
  battery: number | null;
  sleepTarget: SleepTargetResult;
}

export function HeroHeader({ recovery, strain, battery, sleepTarget }: HeroHeaderProps) {
  const hours = Math.floor(sleepTarget.targetMinutes / 60);
  const minutes = Math.round(sleepTarget.targetMinutes % 60);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card
        label="Recovery"
        value={recovery.score != null ? `${Math.round(recovery.score)}%` : "—"}
        sub={recovery.confidence !== "full" ? "building baseline" : undefined}
      />
      <Card label="Day Strain" value={strain.toFixed(1)} sub="of 21" />
      <Card label="Energy Bank" value={battery != null ? `${Math.round(battery)}%` : "—"} />
      <Card label="Sleep Need" value={`${hours}h ${minutes}m`} />
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border border-black/[.08] p-4 dark:border-white/[.145]">
      <p className="text-sm text-foreground/60">{label}</p>
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-foreground/50">{sub}</p>}
    </div>
  );
}
