import type { ReactNode } from "react";
import type { RecoveryResult } from "@/lib/analytics/recovery-score";
import type { SleepTargetResult } from "@/lib/analytics/sleep-debt";
import type { BiologicalAgeResult } from "@/lib/analytics/biological-age";
import type { WidgetKey } from "@/lib/dashboard-widgets";
import { RING_COLORS } from "@/lib/chart-colors";
import { ScoreRing } from "@/components/score-ring";
import { MetricCard } from "@/components/metric-card";
import { BaselineProgress } from "@/components/baseline-progress";
import { WorkoutRecommender } from "@/components/dashboard/workout-recommender";
import { BioAgeTeaser } from "@/components/dashboard/bio-age-teaser";
import { StressBatteryChart, type StressBatteryPoint } from "@/components/charts/stress-battery-chart";

const STRAIN_MAX = 21;
const RECOVERY_BASELINE_TARGET = 14;

// Widgets that need the full row width (a chart) rather than one grid cell.
const WIDE_KEYS = new Set<WidgetKey>(["energy_stress_chart"]);

export interface WidgetData {
  recovery: RecoveryResult;
  strain: number;
  strainSampleCount: number;
  battery: number | null;
  sleepTarget: SleepTargetResult;
  sleepScore: number | null;
  hasSleepHistory: boolean;
  bioAge: BiologicalAgeResult | null;
  hrv: number | null;
  restingHr: number | null;
  chartData: StressBatteryPoint[];
}

function renderWidget(key: WidgetKey, data: WidgetData): ReactNode {
  const sleepHours = Math.floor(data.sleepTarget.targetMinutes / 60);
  const sleepMinutes = Math.round(data.sleepTarget.targetMinutes % 60);

  switch (key) {
    case "strain_ring":
      return (
        <div className="card flex h-full items-center justify-center p-4">
          <ScoreRing
            value={data.strainSampleCount > 0 ? data.strain / STRAIN_MAX : null}
            display={data.strainSampleCount > 0 ? data.strain.toFixed(1) : "-"}
            label="Strain"
            sub={`of ${STRAIN_MAX}`}
            color={RING_COLORS.strain}
          />
        </div>
      );
    case "recovery_ring":
      return (
        <div className="card flex h-full flex-col items-center justify-center gap-3 p-4">
          <ScoreRing
            value={data.recovery.score != null ? data.recovery.score / 100 : null}
            display={data.recovery.score != null ? `${Math.round(data.recovery.score)}%` : "-"}
            label="Recovery"
            sub={data.recovery.confidence !== "full" ? "building baseline" : undefined}
            color={RING_COLORS.recovery}
          />
          {data.recovery.confidence !== "full" && (
            <BaselineProgress
              label="Recovery Score"
              have={data.recovery.nightsUsed}
              need={RECOVERY_BASELINE_TARGET}
              compact
            />
          )}
        </div>
      );
    case "sleep_ring":
      return (
        <div className="card flex h-full items-center justify-center p-4">
          <ScoreRing
            value={data.sleepScore != null ? data.sleepScore / 100 : null}
            display={data.sleepScore != null ? `${data.sleepScore}%` : "-"}
            label="Sleep"
            sub={`target ${sleepHours}h ${sleepMinutes}m`}
            color={RING_COLORS.sleep}
          />
        </div>
      );
    case "energy_bank":
      return <MetricCard label="Energy Bank" value={data.battery != null ? `${Math.round(data.battery)}%` : "-"} />;
    case "workout_recommendation":
      return <WorkoutRecommender recovery={data.recovery.score} />;
    case "bio_age":
      return <BioAgeTeaser result={data.bioAge} />;
    case "hrv":
      return <MetricCard label="HRV" value={data.hrv != null ? `${data.hrv.toFixed(0)} ms` : "-"} />;
    case "resting_hr":
      return <MetricCard label="Resting Heart Rate" value={data.restingHr != null ? `${data.restingHr.toFixed(0)} bpm` : "-"} />;
    case "sleep_debt":
      return (
        <MetricCard
          label="Sleep Debt"
          value={data.hasSleepHistory ? `${Math.round(data.sleepTarget.debtMinutes)} min` : "-"}
          sub={`target ${sleepHours}h ${sleepMinutes}m`}
        />
      );
    case "energy_stress_chart":
      return (
        <section className="card p-4">
          <h2 className="mb-3 eyebrow">Energy Bank &amp; Stress</h2>
          {data.chartData.length === 0 ? (
            <p className="text-sm text-foreground/70">No intraday data yet today.</p>
          ) : (
            <StressBatteryChart data={data.chartData} />
          )}
        </section>
      );
  }
}

export function WidgetGrid({ keys, data }: { keys: WidgetKey[]; data: WidgetData }) {
  return (
    <div className="stagger-children grid grid-cols-2 gap-4 sm:grid-cols-3">
      {keys.map((key) => (
        <div key={key} className={WIDE_KEYS.has(key) ? "col-span-2 sm:col-span-3" : undefined}>
          {renderWidget(key, data)}
        </div>
      ))}
    </div>
  );
}
