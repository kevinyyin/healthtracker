import type { RecoveryResult } from "@/lib/analytics/recovery-score";
import type { SleepTargetResult } from "@/lib/analytics/sleep-debt";
import { MetricCard } from "@/components/metric-card";
import { ScoreRing } from "@/components/score-ring";
import { RING_COLORS } from "@/lib/chart-colors";

const STRAIN_MAX = 21;

interface HeroHeaderProps {
  recovery: RecoveryResult;
  strain: number;
  battery: number | null;
  sleepTarget: SleepTargetResult;
  sleepScore: number | null;
}

export function HeroHeader({ recovery, strain, battery, sleepTarget, sleepScore }: HeroHeaderProps) {
  const hours = Math.floor(sleepTarget.targetMinutes / 60);
  const minutes = Math.round(sleepTarget.targetMinutes % 60);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-around gap-6 rounded border border-black/[.08] p-6 dark:border-white/[.145]">
        <ScoreRing
          value={strain / STRAIN_MAX}
          display={strain.toFixed(1)}
          label="Strain"
          sub={`of ${STRAIN_MAX}`}
          color={RING_COLORS.strain}
        />
        <ScoreRing
          value={recovery.score != null ? recovery.score / 100 : null}
          display={recovery.score != null ? `${Math.round(recovery.score)}%` : "-"}
          label="Recovery"
          sub={recovery.confidence !== "full" ? "building baseline" : undefined}
          color={RING_COLORS.recovery}
        />
        <ScoreRing
          value={sleepScore != null ? sleepScore / 100 : null}
          display={sleepScore != null ? `${sleepScore}%` : "-"}
          label="Sleep"
          sub={`target ${hours}h ${minutes}m`}
          color={RING_COLORS.sleep}
        />
      </div>

      <MetricCard label="Energy Bank" value={battery != null ? `${Math.round(battery)}%` : "-"} />
    </div>
  );
}
