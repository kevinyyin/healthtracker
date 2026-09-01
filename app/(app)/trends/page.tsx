import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { daysBefore, DEFAULT_TIMEZONE, todayLocalDateString } from "@/lib/date";
import { formatDate } from "@/lib/format";
import { toNum } from "@/lib/numeric";
import { computeRecoveryScore } from "@/lib/analytics/recovery-score";
import { computeBiologicalAgeTrend, type BiologicalSex } from "@/lib/analytics/biological-age";
import { excludedDatesFromPeriods } from "@/lib/activity-status";
import { applyOverrides } from "@/lib/health-log-overrides";
import { MetricTrendChart, type TrendPoint } from "@/components/charts/metric-trend-chart";
import { EmptyState } from "@/components/empty-state";

const METRICS = [
  { key: "hrv", label: "HRV" },
  { key: "resting_hr", label: "Resting HR" },
  { key: "total_sleep", label: "Total Sleep" },
  { key: "deep_sleep", label: "Deep Sleep" },
  { key: "recovery", label: "Recovery Score" },
  { key: "bio_age", label: "Biological Age" },
] as const;
type MetricKey = (typeof METRICS)[number]["key"];

const RANGES = [
  { key: "7", label: "7D", days: 7 },
  { key: "30", label: "30D", days: 30 },
  { key: "90", label: "90D", days: 90 },
  { key: "365", label: "1Y", days: 365 },
] as const;

// Extra lookback beyond the visible range so Recovery Score / Biological Age have a
// seeded baseline right from the first visible day, instead of ramping up mid-chart.
const BASELINE_BUFFER_DAYS = 30;

interface HealthLogRow {
  date: string;
  hrv_rmssd: number | null;
  resting_hr: number | null;
  deep_sleep_minutes: number | null;
  total_sleep_minutes: number | null;
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ metric?: string; range?: string }>;
}) {
  const { metric: metricParam, range: rangeParam } = await searchParams;
  const { supabase, user } = await requireUser();

  const metric = METRICS.find((m) => m.key === metricParam) ?? METRICS[0];
  const range = RANGES.find((r) => r.key === rangeParam) ?? RANGES[1];

  // Fetched first because `today` (used to bound the health_logs query below) depends
  // on the user's own timezone.
  const { data: profile } = await supabase
    .from("profiles")
    .select("date_of_birth, biological_sex, timezone")
    .eq("user_id", user.id)
    .maybeSingle();
  const today = todayLocalDateString(profile?.timezone ?? DEFAULT_TIMEZONE);

  const [{ data: healthLogRows }, { data: overrideRows }, { data: statusRows }] = await Promise.all([
    supabase
      .from("health_logs")
      .select("date, hrv_rmssd, resting_hr, deep_sleep_minutes, total_sleep_minutes")
      .eq("user_id", user.id)
      .gte("date", daysBefore(today, range.days + BASELINE_BUFFER_DAYS))
      .order("date", { ascending: true }),
    supabase
      .from("health_log_overrides")
      .select("date, hrv_rmssd, resting_hr, spo2, total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes, awake_minutes")
      .eq("user_id", user.id)
      .gte("date", daysBefore(today, range.days + BASELINE_BUFFER_DAYS)),
    supabase.from("activity_status_periods").select("status, started_on, ended_on").eq("user_id", user.id),
  ]);

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

  const logs: HealthLogRow[] = applyOverrides(
    (healthLogRows ?? []).map((l) => ({
      date: l.date,
      hrv_rmssd: toNum(l.hrv_rmssd),
      resting_hr: toNum(l.resting_hr),
      deep_sleep_minutes: toNum(l.deep_sleep_minutes),
      total_sleep_minutes: toNum(l.total_sleep_minutes),
    })),
    overrides,
  );

  if (logs.length === 0) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
        <div>
          <p className="eyebrow mb-1">History</p>
          <h1 className="text-3xl font-semibold tracking-tight">Trends</h1>
        </div>
        <div className="divider -mt-4" />
        <EmptyState
          title="No history yet"
          hint="Once you have a few days of synced data, historical trends will show up here."
        />
      </main>
    );
  }

  const cutoff = daysBefore(today, range.days);
  const points = computeSeries(metric.key, logs, cutoff, range.days, profile, excludedDates);

  const displayPoints: TrendPoint[] = points.map((p) => ({
    date: formatDate(p.date),
    value: p.value != null ? Number(p.value.toFixed(1)) : null,
  }));

  const hasData = displayPoints.some((p) => p.value != null);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <div>
        <p className="eyebrow mb-1">History</p>
        <h1 className="text-3xl font-semibold tracking-tight">Trends</h1>
      </div>
      <div className="divider -mt-4" />

      <div className="flex flex-wrap gap-1">
        {METRICS.map((m) => (
          <Link key={m.key} href={`/trends?metric=${m.key}&range=${range.key}`} className={tabClass(m.key === metric.key)}>
            {m.label}
          </Link>
        ))}
      </div>

      <div className="flex gap-1">
        {RANGES.map((r) => (
          <Link key={r.key} href={`/trends?metric=${metric.key}&range=${r.key}`} className={tabClass(r.key === range.key)}>
            {r.label}
          </Link>
        ))}
      </div>

      {metric.key === "bio_age" && !profile ? (
        <EmptyState
          title="Add your profile to see this"
          hint="Enter your date of birth and biological sex in Settings to see Biological Age trends."
        />
      ) : !hasData ? (
        <EmptyState title="Not enough data yet" hint="Keep syncing — this metric needs a few more days of history." />
      ) : (
        <div className="card p-4">
          <MetricTrendChart data={displayPoints} label={metric.label} />
        </div>
      )}
    </main>
  );
}

function computeSeries(
  metric: MetricKey,
  logs: HealthLogRow[],
  cutoff: string,
  rangeDays: number,
  profile: { date_of_birth: string; biological_sex: string } | null,
  excludedDates: Set<string>,
): { date: string; value: number | null }[] {
  const visible = logs.filter((l) => l.date >= cutoff);

  switch (metric) {
    case "hrv":
      return visible.map((l) => ({ date: l.date, value: l.hrv_rmssd }));
    case "resting_hr":
      return visible.map((l) => ({ date: l.date, value: l.resting_hr }));
    case "total_sleep":
      return visible.map((l) => ({ date: l.date, value: l.total_sleep_minutes != null ? l.total_sleep_minutes / 60 : null }));
    case "deep_sleep":
      return visible.map((l) => ({ date: l.date, value: l.deep_sleep_minutes }));
    case "recovery":
      return visible.map((day) => {
        const history = logs.filter((l) => l.date < day.date);
        const result = computeRecoveryScore(history, day, excludedDates);
        return { date: day.date, value: result.score };
      });
    case "bio_age": {
      if (!profile) return [];
      const trend = computeBiologicalAgeTrend(
        logs,
        profile.date_of_birth,
        profile.biological_sex as BiologicalSex,
        rangeDays,
        excludedDates,
      );
      return trend.map((t) => ({ date: t.date, value: t.bioAge }));
    }
  }
}

function tabClass(active: boolean): string {
  return `chip ${active ? "chip-active" : ""}`;
}
