import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { ageInYears, daysBefore, DEFAULT_TIMEZONE, localDayEndIso, localDayStartIso, todayLocalDateString } from "@/lib/date";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { toNum } from "@/lib/numeric";
import { computeRecoveryScore, type NightlyMetrics } from "@/lib/analytics/recovery-score";
import { computeDayStrain, resolveMaxHr, type HrSample } from "@/lib/analytics/day-strain";
import { computeSleepTarget } from "@/lib/analytics/sleep-debt";
import { computeSleepScore, type SleepNightMetrics } from "@/lib/analytics/sleep-score";
import { computeEnergyBank } from "@/lib/analytics/energy-bank";
import { computeStressTimeline } from "@/lib/analytics/stress-score";
import { computeHabitCorrelations, type JournalDay, type OutcomeDay } from "@/lib/analytics/habit-correlations";
import { computeBiologicalAge, type BiologicalSex } from "@/lib/analytics/biological-age";
import { computeVo2Max } from "@/lib/analytics/vo2max";
import { computeIllnessSignal } from "@/lib/analytics/illness-signal";
import { recoveryGuidance, sleepGuidance } from "@/lib/analytics/coaching";
import { excludedDatesFromPeriods } from "@/lib/activity-status";
import { applyOverrides } from "@/lib/health-log-overrides";
import { DEFAULT_WIDGET_KEYS, isWidgetKey, type WidgetKey } from "@/lib/dashboard-widgets";
import { WidgetGrid, type WidgetData } from "@/components/dashboard/widget-grid";
import { CustomizeDrawer } from "@/components/dashboard/customize-drawer";
import { type StressBatteryPoint } from "@/components/charts/stress-battery-chart";
import { JournalDrawer } from "@/components/journal/journal-drawer";
import { IllnessBanner } from "@/components/illness-banner";

const HEALTH_LOG_HISTORY_DAYS = 20;
const DEFAULT_START_BATTERY = 70;
// Separate, wider window than HEALTH_LOG_HISTORY_DAYS so the teaser's bio-age baseline
// matches the dedicated /biological-age page (30-night baseline) — reusing the shared
// query would also shift Recovery Score's own baseline, since it slices from the end
// of whatever window is fetched.
const BIO_AGE_HISTORY_DAYS = 35;

export default async function TodayPage() {
  const { supabase, user } = await requireUser();

  // Fetched first (not inside the big Promise.all below) because today/yesterday —
  // used to bound several of those queries — depend on the user's own timezone.
  const { data: profile } = await supabase
    .from("profiles")
    .select("date_of_birth, biological_sex, timezone, max_hr")
    .eq("user_id", user.id)
    .maybeSingle();
  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;

  const today = todayLocalDateString(timezone);
  const yesterday = daysBefore(today, 1);

  const [
    { data: healthLogRows },
    { data: bioAgeLogRows },
    { data: overrideRows },
    { data: intradayRows },
    { data: journalRows },
    { data: widgetsRow },
    { data: statusRows },
    { data: lastSync },
  ] = await Promise.all([
    supabase
      .from("health_logs")
      .select(
        "date, hrv_rmssd, resting_hr, spo2, sleep_start, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes, awake_minutes, total_sleep_minutes, wake_count, sleep_latency_minutes",
      )
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(HEALTH_LOG_HISTORY_DAYS),
    supabase
      .from("health_logs")
      .select("date, hrv_rmssd, resting_hr, deep_sleep_minutes, total_sleep_minutes")
      .eq("user_id", user.id)
      .gte("date", daysBefore(today, BIO_AGE_HISTORY_DAYS))
      .order("date", { ascending: true }),
    supabase
      .from("health_log_overrides")
      .select(
        "date, hrv_rmssd, resting_hr, spo2, total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes, awake_minutes, wake_count, sleep_latency_minutes, sleep_start",
      )
      .eq("user_id", user.id)
      .gte("date", daysBefore(today, BIO_AGE_HISTORY_DAYS)),
    supabase
      .from("intraday_hr")
      .select("recorded_at, bpm, activity_session_id")
      .eq("user_id", user.id)
      .gte("recorded_at", localDayStartIso(today, timezone))
      .lt("recorded_at", localDayEndIso(today, timezone))
      .order("recorded_at", { ascending: true }),
    supabase
      .from("journal_entries")
      .select("date, habits")
      .eq("user_id", user.id)
      .order("date", { ascending: true }),
    supabase.from("dashboard_widgets").select("widget_keys").eq("user_id", user.id).maybeSingle(),
    supabase.from("activity_status_periods").select("status, started_on, ended_on").eq("user_id", user.id),
    supabase
      .from("sync_log")
      .select("started_at, status")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const storedKeys = (widgetsRow?.widget_keys ?? []).filter(isWidgetKey);
  const widgetKeys: WidgetKey[] = storedKeys.length > 0 ? storedKeys : DEFAULT_WIDGET_KEYS;

  const excludedDates = excludedDatesFromPeriods(statusRows ?? [], today);

  // Manual corrections/backfill (Settings > Correct data) — merged on top of the
  // synced values below, since health_logs itself gets overwritten wholesale by the
  // next sync run and can't hold a durable correction directly.
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

  // health_logs numeric columns come back as strings from PostgREST — coerce once here.
  // wake_count is a native integer column, so it comes back as a number already.
  const logs = applyOverrides(
    (healthLogRows ?? []).map((l) => ({
      date: l.date,
      hrv_rmssd: toNum(l.hrv_rmssd),
      resting_hr: toNum(l.resting_hr),
      spo2: toNum(l.spo2),
      sleep_start: l.sleep_start as string | null,
      deep_sleep_minutes: toNum(l.deep_sleep_minutes),
      rem_sleep_minutes: toNum(l.rem_sleep_minutes),
      light_sleep_minutes: toNum(l.light_sleep_minutes),
      awake_minutes: toNum(l.awake_minutes),
      total_sleep_minutes: toNum(l.total_sleep_minutes),
      wake_count: l.wake_count as number | null,
      sleep_latency_minutes: toNum(l.sleep_latency_minutes),
    })),
    overrides,
  );

  const tonight: NightlyMetrics = logs[0] ?? { date: today, hrv_rmssd: null, resting_hr: null };
  const recovery = computeRecoveryScore(logs, tonight, excludedDates);
  const illness = computeIllnessSignal(logs, { ...tonight, spo2: logs[0]?.spo2 ?? null }, excludedDates);

  const intraday = (intradayRows ?? []).map((s) => ({
    recorded_at: s.recorded_at,
    bpm: toNum(s.bpm) ?? 0,
    inWorkout: s.activity_session_id != null,
  }));

  const maxHr = resolveMaxHr(profile?.date_of_birth ?? null, today, profile?.max_hr ?? null);

  const hrSamples: HrSample[] = intraday.map((s) => ({ recorded_at: s.recorded_at, bpm: s.bpm }));
  const dayStrain = computeDayStrain(hrSamples, maxHr);

  const last3Nights = logs.slice(0, 3).map((l) => ({ date: l.date, total_sleep_minutes: l.total_sleep_minutes }));
  const sleepTarget = computeSleepTarget(last3Nights, dayStrain.strain);
  const hasSleepHistory = last3Nights.some((n) => n.total_sleep_minutes != null);

  const tonightSleep: SleepNightMetrics =
    logs[0] ??
    ({
      date: today,
      sleep_start: null,
      total_sleep_minutes: null,
      awake_minutes: null,
      deep_sleep_minutes: null,
      rem_sleep_minutes: null,
      wake_count: null,
      sleep_latency_minutes: null,
    } satisfies SleepNightMetrics);
  const sleepScoreResult = computeSleepScore(logs, tonightSleep, sleepTarget.targetMinutes, excludedDates, timezone);

  const energyTimeline = intraday.map((s) => ({ minute: s.recorded_at, bpm: s.bpm, activeCalories: null }));
  const battery = computeEnergyBank(energyTimeline, recovery.score ?? DEFAULT_START_BATTERY, maxHr);

  const stressMinutes = intraday.map((s) => ({ minute: s.recorded_at, bpm: s.bpm, inWorkout: s.inWorkout }));
  const stress = computeStressTimeline(stressMinutes, tonight.resting_hr);

  const chartData: StressBatteryPoint[] = battery.map((b, i) => ({
    minute: new Date(b.minute).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    battery: b.battery,
    stress: stress[i]?.stress ?? null,
  }));

  const currentBattery = battery.length > 0 ? battery[battery.length - 1].battery : (recovery.score ?? null);

  // Recovery score per historical day (each using only earlier days as its own baseline),
  // needed as habit-correlation outcomes.
  const ascLogs = [...logs].reverse();
  const outcomes: OutcomeDay[] = ascLogs.map((day, i) => {
    const dayRecovery = computeRecoveryScore(ascLogs.slice(0, i), day, excludedDates);
    return { date: day.date, recovery: dayRecovery.score, deepSleepMinutes: day.deep_sleep_minutes };
  });

  const journalDays: JournalDay[] = (journalRows ?? []).map((j) => ({ date: j.date, habits: j.habits }));
  const correlations = computeHabitCorrelations(journalDays, outcomes, excludedDates);

  const bioAgeLogs = applyOverrides(
    (bioAgeLogRows ?? []).map((l) => ({
      date: l.date,
      hrv_rmssd: toNum(l.hrv_rmssd),
      resting_hr: toNum(l.resting_hr),
      deep_sleep_minutes: toNum(l.deep_sleep_minutes),
      total_sleep_minutes: toNum(l.total_sleep_minutes),
    })),
    overrides,
  );
  const bioAgeResult = profile
    ? computeBiologicalAge(
        bioAgeLogs,
        today,
        ageInYears(profile.date_of_birth, today),
        profile.biological_sex as BiologicalSex,
        excludedDates,
      )
    : null;

  const vo2max = profile ? computeVo2Max(bioAgeLogs, today, maxHr, excludedDates) : null;

  const habitsToday = journalDays.find((j) => j.date === today)?.habits ?? [];
  const habitsYesterday = journalDays.find((j) => j.date === yesterday)?.habits ?? [];

  const widgetData: WidgetData = {
    recovery,
    strain: dayStrain.strain,
    strainSampleCount: dayStrain.sampleCount,
    battery: currentBattery,
    sleepTarget,
    sleepScore: sleepScoreResult.score,
    hasSleepHistory,
    bioAge: bioAgeResult,
    vo2max,
    hrv: tonight.hrv_rmssd,
    restingHr: tonight.resting_hr,
    chartData,
    recoveryGuidance: recoveryGuidance(recovery),
    sleepGuidance: sleepGuidance(sleepScoreResult, sleepTarget),
  };

  const syncHasError = lastSync?.status === "error";
  const syncCaption = lastSync
    ? syncHasError
      ? "Sync issue — check Settings"
      : `Synced ${formatRelativeTime(lastSync.started_at)}`
    : "Not synced yet";

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-1">Recovery Reading</p>
          <h1 className="text-3xl font-semibold tracking-tight">{formatDate(today)}</h1>
          <p className={`mt-1 text-xs ${syncHasError ? "text-danger" : "text-foreground/70"}`}>{syncCaption}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/trends" className="btn btn-outline btn-sm">
            Trends
          </Link>
          <CustomizeDrawer initialKeys={widgetKeys} />
        </div>
      </div>
      <div className="divider -mt-4" />

      {illness.flagged && <IllnessBanner reasons={illness.reasons} />}

      <WidgetGrid keys={widgetKeys} data={widgetData} />

      <JournalDrawer
        today={today}
        yesterday={yesterday}
        habitsToday={habitsToday}
        habitsYesterday={habitsYesterday}
        correlations={correlations}
      />
    </main>
  );
}
