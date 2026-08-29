import { requireUser } from "@/lib/supabase/server";
import { ageInYears, daysBefore, todayLocalDateString } from "@/lib/date";
import { formatDate } from "@/lib/format";
import { toNum } from "@/lib/numeric";
import { computeBiologicalAge, computeBiologicalAgeTrend, type BiologicalSex } from "@/lib/analytics/biological-age";
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
    .select("date_of_birth, biological_sex")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
        <h1 className="text-2xl font-semibold">Biological Age</h1>
        <EmptyState
          title="Add your profile to see this"
          hint="Enter your date of birth and biological sex in Settings so we can compare your HRV, resting heart rate, and sleep against age-normed population trends."
        />
      </main>
    );
  }

  const today = todayLocalDateString();

  const { data: healthLogRows } = await supabase
    .from("health_logs")
    .select("date, hrv_rmssd, resting_hr, deep_sleep_minutes, total_sleep_minutes")
    .eq("user_id", user.id)
    .gte("date", daysBefore(today, HISTORY_DAYS))
    .order("date", { ascending: true });

  const logsAscending = (healthLogRows ?? []).map((l) => ({
    date: l.date,
    hrv_rmssd: toNum(l.hrv_rmssd),
    resting_hr: toNum(l.resting_hr),
    deep_sleep_minutes: toNum(l.deep_sleep_minutes),
    total_sleep_minutes: toNum(l.total_sleep_minutes),
  }));

  const sex = profile.biological_sex as BiologicalSex;
  const chronoAge = ageInYears(profile.date_of_birth, today);
  const result = computeBiologicalAge(logsAscending, today, chronoAge, sex);
  const trend = computeBiologicalAgeTrend(logsAscending, profile.date_of_birth, sex, TREND_DAYS);

  const trendPoints: BioAgeTrendPoint[] = trend.map((t) => ({
    date: formatDate(t.date),
    bioAge: t.bioAge != null ? Number(t.bioAge.toFixed(1)) : null,
    chronoAge: t.chronoAge,
  }));

  const delta = result.bioAge != null ? result.chronoAge - result.bioAge : null;
  const ringFraction = result.bioAge != null ? 0.5 + delta! / 24 : null;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">Biological Age</h1>

      <div className="flex justify-center rounded border border-black/[.08] p-6 dark:border-white/[.145]">
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
        <BaselineProgress label="Biological Age" have={result.nightsUsed} need={FULL_CONFIDENCE_NIGHTS} />
      )}

      {result.factors.length > 0 && (
        <section>
          <h2 className="mb-3 font-medium">Contributing factors</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
        <section>
          <h2 className="mb-3 font-medium">Trend</h2>
          <BioAgeTrendChart data={trendPoints} />
        </section>
      )}

      <section className="flex flex-col gap-2 rounded border border-dashed border-black/[.12] p-4 text-sm text-foreground/60 dark:border-white/[.15]">
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
