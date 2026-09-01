import { requireUser } from "@/lib/supabase/server";
import { ageInYears, daysBefore, todayLocalDateString } from "@/lib/date";
import { formatDate } from "@/lib/format";
import { toNum } from "@/lib/numeric";
import { computeBiologicalAge, computeBiologicalAgeTrend, type BiologicalSex } from "@/lib/analytics/biological-age";
import { excludedDatesFromPeriods } from "@/lib/activity-status";
import { applyOverrides } from "@/lib/health-log-overrides";
import { ScoreRing } from "@/components/score-ring";
import { MetricCard } from "@/components/metric-card";
import { BaselineProgress } from "@/components/baseline-progress";
import { EmptyState } from "@/components/empty-state";
import { BioAgeTrendChart, type BioAgeTrendPoint } from "@/components/charts/bio-age-trend-chart";
import { RING_COLORS } from "@/lib/chart-colors";

const HISTORY_DAYS = 120;
const TREND_DAYS = 90;
const FULL_CONFIDENCE_NIGHTS = 30;

export default async function BiologicalAgePage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("date_of_birth, biological_sex, timezone")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
        <div>
          <p className="eyebrow mb-1">Longevity</p>
          <h1 className="text-3xl font-semibold tracking-tight">Biological Age</h1>
        </div>
        <div className="divider -mt-4" />
        <EmptyState
          title="Add your profile to see this"
          hint="Enter your date of birth and biological sex in Settings so we can compare your HRV, resting heart rate, and sleep against age-normed population trends."
        />
      </main>
    );
  }

  const today = todayLocalDateString(profile.timezone);

  const { data: healthLogRows } = await supabase
    .from("health_logs")
    .select("date, hrv_rmssd, resting_hr, deep_sleep_minutes, total_sleep_minutes")
    .eq("user_id", user.id)
    .gte("date", daysBefore(today, HISTORY_DAYS))
    .order("date", { ascending: true });

  const { data: overrideRows } = await supabase
    .from("health_log_overrides")
    .select("date, hrv_rmssd, resting_hr, spo2, total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes, awake_minutes")
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
    (healthLogRows ?? []).map((l) => ({
      date: l.date,
      hrv_rmssd: toNum(l.hrv_rmssd),
      resting_hr: toNum(l.resting_hr),
      deep_sleep_minutes: toNum(l.deep_sleep_minutes),
      total_sleep_minutes: toNum(l.total_sleep_minutes),
    })),
    overrides,
  );

  const sex = profile.biological_sex as BiologicalSex;
  const chronoAge = ageInYears(profile.date_of_birth, today);
  const result = computeBiologicalAge(logsAscending, today, chronoAge, sex, excludedDates);
  const trend = computeBiologicalAgeTrend(logsAscending, profile.date_of_birth, sex, TREND_DAYS, excludedDates);

  const trendPoints: BioAgeTrendPoint[] = trend.map((t) => ({
    date: formatDate(t.date),
    bioAge: t.bioAge != null ? Number(t.bioAge.toFixed(1)) : null,
    chronoAge: t.chronoAge,
  }));

  const delta = result.bioAge != null ? result.chronoAge - result.bioAge : null;
  const ringFraction = result.bioAge != null ? 0.5 + delta! / 24 : null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
      <div>
        <p className="eyebrow mb-1">Longevity</p>
        <h1 className="text-3xl font-semibold tracking-tight">Biological Age</h1>
      </div>
      <div className="divider -mt-4" />

      <div className="card flex justify-center p-6">
        <ScoreRing
          value={ringFraction}
          display={result.bioAge != null ? result.bioAge.toFixed(0) : "-"}
          label="Biological Age"
          sub={
            delta != null
              ? `${delta >= 0 ? "-" : "+"}${Math.abs(delta).toFixed(1)} yrs vs your age of ${chronoAge}`
              : `your age is ${chronoAge}`
          }
          color={RING_COLORS.bioAge}
        />
      </div>

      {result.confidence !== "full" && (
        <BaselineProgress
          label="Biological Age"
          have={result.nightsUsed}
          need={FULL_CONFIDENCE_NIGHTS}
          color={RING_COLORS.bioAge}
        />
      )}

      {result.factors.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Contributing factors</h2>
          <div className="stagger-children grid grid-cols-2 gap-4 sm:grid-cols-4">
            {result.factors.map((f) => (
              <MetricCard
                key={f.key}
                label={f.label}
                value={f.personalValue != null ? f.personalValue.toFixed(1) : "-"}
                sub={
                  f.expectedForAge != null && f.ageAdjustmentYears != null
                    ? `expected ${f.expectedForAge.toFixed(1)} at ${chronoAge} · ${
                        f.ageAdjustmentYears >= 0 ? "+" : ""
                      }${f.ageAdjustmentYears.toFixed(1)} yrs`
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      )}

      {trendPoints.length > 1 && (
        <section className="card p-4">
          <h2 className="eyebrow mb-3">Trend</h2>
          <BioAgeTrendChart data={trendPoints} />
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-[1.25rem] border border-dashed border-[var(--border)] p-4 text-sm text-foreground/60">
        <h2 className="font-medium text-foreground">Methodology &amp; caveats</h2>
        <p>
          This is a wellness estimate, not a clinical or epigenetic age test. It compares your trailing 30-day
          average HRV (RMSSD), resting heart rate, and sleep architecture (deep sleep % and total duration) against
          illustrative, order-of-magnitude population trends by age and sex from published research.
        </p>
        <p>
          Wearable nocturnal HRV isn&apos;t measured the same way as the short-term resting readings most published
          reference ranges use, so treat the absolute number as a rough approximation, not a precise measurement.
          This estimate doesn&apos;t diagnose anything — for real health concerns, talk to a clinician.
        </p>
      </section>
    </main>
  );
}
