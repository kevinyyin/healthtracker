import type { ReactNode } from "react";
import Link from "next/link";
import type { RecoveryResult } from "@/lib/analytics/recovery-score";
import type { SleepTargetResult } from "@/lib/analytics/sleep-debt";
import type { BiologicalAgeResult } from "@/lib/analytics/biological-age";
import type { Vo2MaxResult } from "@/lib/analytics/vo2max";
import { recommendTargetStrain } from "@/lib/analytics/day-strain";
import type { WidgetKey } from "@/lib/dashboard-widgets";
import { RING_COLORS } from "@/lib/chart-colors";
import { ScoreRing } from "@/components/score-ring";
import { MetricCard } from "@/components/metric-card";
import { BaselineProgress } from "@/components/baseline-progress";
import { WorkoutRecommender } from "@/components/dashboard/workout-recommender";
import { BioAgeTeaser } from "@/components/dashboard/bio-age-teaser";
import { Vo2MaxTeaser } from "@/components/dashboard/vo2max-teaser";
import { DailyGuidance } from "@/components/dashboard/daily-guidance";
import { StressBatteryChart, type StressBatteryPoint } from "@/components/charts/stress-battery-chart";

const STRAIN_MAX = 100;
const RECOVERY_BASELINE_TARGET = 14;

// Widgets that need the full row width (a chart, or a short paragraph of text) rather than one grid cell.
const WIDE_KEYS = new Set<WidgetKey>(["energy_stress_chart", "daily_guidance"]);

// The three rings get their own row, visually distinct from the secondary metric cards
// below — otherwise a flat grid reads as one undifferentiated wall as widget count grows.
const RING_KEYS = new Set<WidgetKey>(["strain_ring", "recovery_ring", "sleep_ring"]);

export interface WidgetData {
  recovery: RecoveryResult;
  strain: number;
  strainSampleCount: number;
  battery: number | null;
  sleepTarget: SleepTargetResult;
  sleepScore: number | null;
  hasSleepHistory: boolean;
  bioAge: BiologicalAgeResult | null;
  vo2max: Vo2MaxResult | null;
  hrv: number | null;
  restingHr: number | null;
  chartData: StressBatteryPoint[];
  recoveryGuidance: string;
  sleepGuidance: string;
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
            display={data.strainSampleCount > 0 ? Math.round(data.strain).toString() : "-"}
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
              color={RING_COLORS.recovery}
              compact
            />
          )}
        </div>
      );
    case "sleep_ring":
      return (
        <Link href="/sleep" className="card card-interactive group relative flex h-full items-center justify-center p-4">
          <ScoreRing
            value={data.sleepScore != null ? data.sleepScore / 100 : null}
            display={data.sleepScore != null ? `${data.sleepScore}%` : "-"}
            label="Sleep"
            sub={`target ${sleepHours}h ${sleepMinutes}m`}
            color={RING_COLORS.sleep}
          />
          <span
            aria-hidden="true"
            className="absolute right-4 top-4 text-foreground/40 transition-transform duration-300 group-hover:translate-x-0.5"
          >
            &rarr;
          </span>
        </Link>
      );
    case "energy_bank":
      return <MetricCard label="Energy Bank" value={data.battery != null ? `${Math.round(data.battery)}%` : "-"} />;
    case "workout_recommendation":
      return <WorkoutRecommender recovery={data.recovery.score} />;
    case "bio_age":
      return <BioAgeTeaser result={data.bioAge} />;
    case "vo2max":
      return <Vo2MaxTeaser result={data.vo2max} />;
    case "hrv":
      return <MetricCard label="HRV" value={data.hrv != null ? `${data.hrv.toFixed(0)} ms` : "-"} href="/vitals" />;
    case "resting_hr":
      return (
        <MetricCard
          label="Resting Heart Rate"
          value={data.restingHr != null ? `${data.restingHr.toFixed(0)} bpm` : "-"}
          href="/vitals"
        />
      );
    case "sleep_debt":
      return (
        <MetricCard
          label="Sleep Debt"
          value={data.hasSleepHistory ? `${Math.round(data.sleepTarget.debtMinutes)} min` : "-"}
          sub={`target ${sleepHours}h ${sleepMinutes}m`}
          href="/sleep"
        />
      );
    case "daily_guidance":
      return (
        <DailyGuidance
          recovery={data.recoveryGuidance}
          sleep={data.sleepGuidance}
          strain={recommendTargetStrain(data.recovery.score).label}
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
  const ringKeys = keys.filter((key) => RING_KEYS.has(key));
  const restKeys = keys.filter((key) => !RING_KEYS.has(key));

  return (
    <div className="flex flex-col gap-6">
      {ringKeys.length > 0 && (
        <div className="stagger-children grid grid-cols-2 gap-4 sm:grid-cols-3">
          {ringKeys.map((key) => (
            <div key={key}>{renderWidget(key, data)}</div>
          ))}
        </div>
      )}
      {restKeys.length > 0 && (
        <div className="flex flex-col gap-3">
          {ringKeys.length > 0 && <p className="eyebrow">Details</p>}
          <div className="stagger-children grid grid-cols-2 gap-4 sm:grid-cols-3">
            {restKeys.map((key) => (
              <div key={key} className={WIDE_KEYS.has(key) ? "col-span-2 sm:col-span-3" : undefined}>
                {renderWidget(key, data)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
