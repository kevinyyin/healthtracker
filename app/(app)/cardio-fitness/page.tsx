import { requireUser } from "@/lib/supabase/server";
import { daysBefore, todayLocalDateString } from "@/lib/date";
import { formatDate } from "@/lib/format";
import { toNum } from "@/lib/numeric";
import { computeVo2Max, computeVo2MaxTrend } from "@/lib/analytics/vo2max";
import { resolveMaxHr } from "@/lib/analytics/day-strain";
import { excludedDatesFromPeriods } from "@/lib/activity-status";
import { applyOverrides } from "@/lib/health-log-overrides";
import { ScoreRing } from "@/components/score-ring";
import { BaselineProgress } from "@/components/baseline-progress";
import { EmptyState } from "@/components/empty-state";
import { MetricTrendChart, type TrendPoint } from "@/components/charts/metric-trend-chart";
import { RING_COLORS } from "@/lib/chart-colors";

const HISTORY_DAYS = 120;
const TREND_DAYS = 90;
const FULL_CONFIDENCE_NIGHTS = 30;
const VO2MAX_MIN = 20;
const VO2MAX_MAX = 70;

export default async function CardioFitnessPage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("date_of_birth, timezone, max_hr")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
        <div>
          <p className="eyebrow mb-1">Fitness</p>
          <h1 className="text-3xl font-semibold tracking-tight">Cardio Fitness</h1>
        </div>
        <div className="divider -mt-4" />
        <EmptyState
          title="Add your profile to see this"
          hint="Enter your date of birth in Settings so we can estimate your cardio fitness (VO2max) from your resting heart rate."
        />
      </main>
    );
  }

  const today = todayLocalDateString(profile.timezone);
  const maxHr = resolveMaxHr(profile.date_of_birth, today, profile.max_hr);

  const { data: healthLogRows } = await supabase
    .from("health_logs")
    .select("date, resting_hr")
    .eq("user_id", user.id)
    .gte("date", daysBefore(today, HISTORY_DAYS))
    .order("date", { ascending: true });

  const { data: overrideRows } = await supabase
    .from("health_log_overrides")
    .select(
      "date, hrv_rmssd, resting_hr, spo2, total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes, awake_minutes",
    )
    .eq("user_id", user.id)
    .gte("date", daysBefore(today, HISTORY_DAYS));

  const { data: statusRows } = await supabase
    .from("activity_status_periods")
    .select("status, started_on, ended_on")
    .eq("user_id", user.id);
  const excludedDates = excludedDatesFromPeriods(statusRows ?? [], today);

  const overrides = (overrideRows ?? []).map((o) => ({
    date: o.date,
    hrv_rmssd: toNum(o.hrv_rmssd),
    resting_hr: toNum(o.resting_hr),
    spo2: toNum(o.spo2),
    total_sleep_minutes: toNum(o.total_sleep_minutes),
    deep_sleep_minutes: toNum(o.deep_sleep_minutes),
    rem_sleep_minutes: toNum(o.rem_sleep_minutes),
    light_sleep_minutes: toNum(o.light_sleep_minutes),
    awake_minutes: toNum(o.awake_minutes),
  }));

  const logsAscending = applyOverrides(
    (healthLogRows ?? []).map((l) => ({ date: l.date, resting_hr: toNum(l.resting_hr) })),
    overrides,
  );

  const result = computeVo2Max(logsAscending, today, maxHr, excludedDates);
  const trend = computeVo2MaxTrend(logsAscending, maxHr, TREND_DAYS, excludedDates);

  const trendPoints: TrendPoint[] = trend.map((t) => ({
    date: formatDate(t.date),
    value: t.vo2max != null ? Number(t.vo2max.toFixed(1)) : null,
  }));

  const ringFraction = result.vo2max != null ? (result.vo2max - VO2MAX_MIN) / (VO2MAX_MAX - VO2MAX_MIN) : null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
      <div>
        <p className="eyebrow mb-1">Fitness</p>
        <h1 className="text-3xl font-semibold tracking-tight">Cardio Fitness</h1>
      </div>
      <div className="divider -mt-4" />

      <div className="card flex justify-center p-6">
        <ScoreRing
          value={ringFraction}
          display={result.vo2max != null ? result.vo2max.toFixed(0) : "-"}
          label="VO2max (estimate)"
          sub={result.restingHrBaseline != null ? `resting HR baseline ${result.restingHrBaseline.toFixed(0)} bpm` : undefined}
          color={RING_COLORS.vo2max}
        />
      </div>

      {result.confidence !== "full" && (
        <BaselineProgress
          label="Cardio Fitness"
          have={result.nightsUsed}
          need={FULL_CONFIDENCE_NIGHTS}
          color={RING_COLORS.vo2max}
        />
      )}

      {trendPoints.length > 1 && (
        <section className="card p-4">
          <h2 className="eyebrow mb-3">Trend</h2>
          <MetricTrendChart data={trendPoints} label="VO2max" />
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-[1.25rem] border border-dashed border-[var(--border)] p-4 text-sm text-foreground/60">
        <h2 className="font-medium text-foreground">Methodology &amp; caveats</h2>
        <p>
          This is a non-exercise VO2max <strong>estimate</strong>, not a measured value — there&apos;s no treadmill or
          lab test involved. It uses the Uth–Sørensen–Overgaard–Pedersen formula (2004): VO2max ≈ 15.3 ×
          (max HR ÷ resting HR), with your trailing 30-day resting heart rate as the baseline and your Max HR from
          Settings (or 220 minus your age if you haven&apos;t set one).
        </p>
        <p>
          Treat the number as directionally useful — improving as resting HR trends down relative to your max — rather
          than a precise fitness-test result. This estimate doesn&apos;t diagnose anything.
        </p>
      </section>
    </main>
  );
}
