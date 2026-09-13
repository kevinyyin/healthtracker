import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { daysBefore, localDayEndIso, localDayStartIso, todayLocalDateString, DEFAULT_TIMEZONE } from "@/lib/date";
import { formatDate } from "@/lib/format";
import { toNum } from "@/lib/numeric";
import { formatWeight, type UnitSystem } from "@/lib/units";
import { computeRecapSummary, type RecapNightlyMetrics } from "@/lib/analytics/recap";
import { computeDayStrain, resolveMaxHr, type HrSample } from "@/lib/analytics/day-strain";
import { excludedDatesFromPeriods } from "@/lib/activity-status";
import { applyOverrides } from "@/lib/health-log-overrides";
import type { BiologicalSex } from "@/lib/analytics/biological-age";
import type { JournalDay } from "@/lib/analytics/habit-correlations";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { PrintButton } from "@/components/recap/print-button";

const PERIODS = [
  { key: "week", label: "Week", days: 7 },
  { key: "month", label: "Month", days: 30 },
  { key: "year", label: "Year", days: 365 },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

// Extra lookback so Recovery/Sleep Score/Biological Age have a seeded baseline right
// from the first visible day, instead of ramping up mid-report — same idea as
// trends/page.tsx's BASELINE_BUFFER_DAYS.
const BASELINE_BUFFER_DAYS = 30;

// Recomputing Day Strain means pulling intraday_hr (minute-level HR samples) for
// every visible day — cheap for a week/month, prohibitively large for a year. See
// the note in lib/analytics/recap.ts.
const STRAIN_ELIGIBLE_PERIODS = new Set<PeriodKey>(["week", "month"]);

export default async function RecapPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const { supabase, user } = await requireUser();

  const period = PERIODS.find((p) => p.key === periodParam) ?? PERIODS[0];

  const { data: profile } = await supabase
    .from("profiles")
    .select("date_of_birth, biological_sex, timezone, max_hr, unit_system")
    .eq("user_id", user.id)
    .maybeSingle();
  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const today = todayLocalDateString(timezone);
  const unitSystem: UnitSystem = (profile?.unit_system as UnitSystem | undefined) ?? "metric";

  const periodStart = daysBefore(today, period.days - 1);
  const fetchSince = daysBefore(today, period.days - 1 + BASELINE_BUFFER_DAYS);

  const [{ data: healthLogRows }, { data: overrideRows }, { data: statusRows }, { data: journalRows }] =
    await Promise.all([
      supabase
        .from("health_logs")
        .select(
          "date, hrv_rmssd, resting_hr, spo2, sleep_start, deep_sleep_minutes, rem_sleep_minutes, awake_minutes, total_sleep_minutes, wake_count, sleep_latency_minutes",
        )
        .eq("user_id", user.id)
        .gte("date", fetchSince)
        .order("date", { ascending: true }),
      supabase
        .from("health_log_overrides")
        .select(
          "date, hrv_rmssd, resting_hr, spo2, total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes, awake_minutes, wake_count, sleep_latency_minutes, sleep_start",
        )
        .eq("user_id", user.id)
        .gte("date", fetchSince),
      supabase.from("activity_status_periods").select("status, started_on, ended_on").eq("user_id", user.id),
      supabase.from("journal_entries").select("date, habits").eq("user_id", user.id).gte("date", fetchSince),
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
    wake_count: o.wake_count as number | null,
    sleep_latency_minutes: toNum(o.sleep_latency_minutes),
    sleep_start: o.sleep_start as string | null,
  }));

  const logsAscending: RecapNightlyMetrics[] = applyOverrides(
    (healthLogRows ?? []).map((l) => ({
      date: l.date,
      hrv_rmssd: toNum(l.hrv_rmssd),
      resting_hr: toNum(l.resting_hr),
      spo2: toNum(l.spo2),
      sleep_start: l.sleep_start as string | null,
      deep_sleep_minutes: toNum(l.deep_sleep_minutes),
      rem_sleep_minutes: toNum(l.rem_sleep_minutes),
      awake_minutes: toNum(l.awake_minutes),
      total_sleep_minutes: toNum(l.total_sleep_minutes),
      wake_count: l.wake_count as number | null,
      sleep_latency_minutes: toNum(l.sleep_latency_minutes),
    })),
    overrides,
  );

  if (logsAscending.length === 0) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
        <div>
          <p className="eyebrow mb-1">Reports</p>
          <h1 className="text-3xl font-semibold tracking-tight">Recap</h1>
        </div>
        <div className="divider -mt-4" />
        <EmptyState title="No history yet" hint="Once you have a few days of synced data, your recap will show up here." />
      </main>
    );
  }

  const journalDays: JournalDay[] = (journalRows ?? []).map((j) => ({ date: j.date, habits: j.habits }));
  const dob = profile?.date_of_birth ?? null;
  const sex = (profile?.biological_sex as BiologicalSex | undefined) ?? null;

  const summary = computeRecapSummary(logsAscending, journalDays, excludedDates, periodStart, today, dob, sex, timezone);

  let avgStrain: number | null = null;
  if (STRAIN_ELIGIBLE_PERIODS.has(period.key)) {
    const { data: intradayRows } = await supabase
      .from("intraday_hr")
      .select("recorded_at, bpm")
      .eq("user_id", user.id)
      .gte("recorded_at", localDayStartIso(periodStart, timezone))
      .lt("recorded_at", localDayEndIso(today, timezone))
      .order("recorded_at", { ascending: true });

    const maxHr = resolveMaxHr(dob, today, profile?.max_hr ?? null);
    const byDay = new Map<string, HrSample[]>();
    for (const row of intradayRows ?? []) {
      const bpm = toNum(row.bpm);
      if (bpm == null) continue;
      const date = row.recorded_at.slice(0, 10);
      if (!byDay.has(date)) byDay.set(date, []);
      byDay.get(date)!.push({ recorded_at: row.recorded_at, bpm });
    }
    const dailyStrains = [...byDay.values()].map((samples) => computeDayStrain(samples, maxHr).strain);
    avgStrain = dailyStrains.length > 0 ? dailyStrains.reduce((a, b) => a + b, 0) / dailyStrains.length : null;
  }

  const latestWeightKg = await fetchLatestWeightKg(supabase, user.id, periodStart);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
      <div className="print:hidden">
        <p className="eyebrow mb-1">Reports</p>
        <h1 className="text-3xl font-semibold tracking-tight">Recap</h1>
      </div>
      <div className="hidden print:block">
        <p className="text-sm text-foreground/60">
          {formatDate(periodStart)} – {formatDate(today)}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Health Recap</h1>
      </div>
      <div className="divider -mt-4 print:hidden" />

      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Link key={p.key} href={`/recap?period=${p.key}`} className={`chip ${p.key === period.key ? "chip-active" : ""}`}>
              {p.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-2">
          <a href={`/api/recap/export?period=${period.key}`} className="btn btn-outline btn-sm">
            Export CSV
          </a>
          <PrintButton />
        </div>
      </div>

      <section className="stagger-children grid grid-cols-2 gap-4 sm:grid-cols-3">
        <MetricCard label="Avg Recovery" value={summary.avgRecovery != null ? `${Math.round(summary.avgRecovery)}%` : "-"} />
        <MetricCard label="Avg Sleep Score" value={summary.avgSleepScore != null ? `${Math.round(summary.avgSleepScore)}%` : "-"} />
        <MetricCard
          label="Sleep Debt"
          value={summary.sleepDebtEndMinutes != null ? `${Math.round(summary.sleepDebtEndMinutes)} min` : "-"}
        />
        {STRAIN_ELIGIBLE_PERIODS.has(period.key) ? (
          <MetricCard label="Avg Strain" value={avgStrain != null ? avgStrain.toFixed(0) : "-"} />
        ) : (
          <MetricCard label="Avg Strain" value="-" sub="Available on Week/Month" />
        )}
        {dob != null && sex != null && (
          <MetricCard
            label="Biological Age"
            value={
              summary.bioAgeDeltaYears != null
                ? `${summary.bioAgeDeltaYears >= 0 ? "-" : "+"}${Math.abs(summary.bioAgeDeltaYears).toFixed(1)} yrs`
                : "-"
            }
            sub="change this period"
          />
        )}
        {latestWeightKg != null && <MetricCard label="Weight" value={formatWeight(latestWeightKg, unitSystem)} />}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">Highlights</h2>
        <div className="stagger-children grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MetricCard
            label="Best Recovery Day"
            value={summary.bestRecoveryDay ? `${Math.round(summary.bestRecoveryDay.value)}%` : "-"}
            sub={summary.bestRecoveryDay ? formatDate(summary.bestRecoveryDay.date) : undefined}
          />
          <MetricCard
            label="Toughest Recovery Day"
            value={summary.worstRecoveryDay ? `${Math.round(summary.worstRecoveryDay.value)}%` : "-"}
            sub={summary.worstRecoveryDay ? formatDate(summary.worstRecoveryDay.date) : undefined}
          />
          <MetricCard
            label="Longest Sleep"
            value={summary.longestSleepNight ? formatHoursMinutes(summary.longestSleepNight.value) : "-"}
            sub={summary.longestSleepNight ? formatDate(summary.longestSleepNight.date) : undefined}
          />
        </div>
        <p className="text-xs text-foreground/50">
          {summary.illnessFlaggedDays} day{summary.illnessFlaggedDays === 1 ? "" : "s"} flagged for an illness signal ·{" "}
          {summary.lowRecoveryDays} low-recovery day{summary.lowRecoveryDays === 1 ? "" : "s"} out of{" "}
          {summary.nightsWithData}.
        </p>
      </section>

      {summary.topHabitCorrelations.length > 0 && (
        <section className="card p-4">
          <h2 className="eyebrow mb-3">Habits</h2>
          <ul className="flex flex-col gap-1 text-sm text-foreground/70">
            {summary.topHabitCorrelations.map((c, i) => (
              <li key={i}>
                {c.habit}: {c.outcome === "recovery" ? "Recovery" : "Deep sleep"}{" "}
                <span className={`figure ${c.effect >= 0 ? "text-success" : "text-danger"}`}>
                  {c.effect >= 0 ? "+" : ""}
                  {c.outcome === "recovery" ? `${c.effect.toFixed(1)}%` : `${Math.round(c.effect)}min`}
                </span>{" "}
                (n={c.nWith})
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-foreground/60 print:hidden">
        Want day-by-day detail?{" "}
        <Link href="/trends" className="underline">
          View Trends
        </Link>
        .
      </p>
    </main>
  );
}

function formatHoursMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

async function fetchLatestWeightKg(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  periodStart: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("vitals_readings")
    .select("value")
    .eq("user_id", userId)
    .eq("metric_type", "weight")
    .gte("recorded_at", periodStart)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return toNum(data?.value);
}
