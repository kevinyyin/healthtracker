import { requireUser } from "@/lib/supabase/server";
import { daysBefore, localDayEndIso, localDayStartIso, todayLocalDateString } from "@/lib/date";
import { formatDate } from "@/lib/format";
import { toNum } from "@/lib/numeric";
import { computeRecoveryScore, type NightlyMetrics } from "@/lib/analytics/recovery-score";
import { computeDayStrain, type HrSample } from "@/lib/analytics/day-strain";
import { computeSleepTarget } from "@/lib/analytics/sleep-debt";
import { computeEnergyBank } from "@/lib/analytics/energy-bank";
import { computeStressTimeline } from "@/lib/analytics/stress-score";
import { computeHabitCorrelations, type JournalDay, type OutcomeDay } from "@/lib/analytics/habit-correlations";
import { HeroHeader } from "@/components/dashboard/hero-header";
import { WorkoutRecommender } from "@/components/dashboard/workout-recommender";
import { StressBatteryChart, type StressBatteryPoint } from "@/components/charts/stress-battery-chart";
import { JournalDrawer } from "@/components/journal/journal-drawer";
import { BaselineProgress } from "@/components/baseline-progress";

const HEALTH_LOG_HISTORY_DAYS = 20;
const RECOVERY_BASELINE_TARGET = 14;
const DEFAULT_START_BATTERY = 70;

export default async function TodayPage() {
  const { supabase, user } = await requireUser();

  const today = todayLocalDateString();
  const yesterday = daysBefore(today, 1);

  const [{ data: healthLogRows }, { data: intradayRows }, { data: journalRows }] = await Promise.all([
    supabase
      .from("health_logs")
      .select("date, hrv_rmssd, resting_hr, deep_sleep_minutes, total_sleep_minutes")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(HEALTH_LOG_HISTORY_DAYS),
    supabase
      .from("intraday_hr")
      .select("recorded_at, bpm, activity_session_id")
      .eq("user_id", user.id)
      .gte("recorded_at", localDayStartIso(today))
      .lt("recorded_at", localDayEndIso(today))
      .order("recorded_at", { ascending: true }),
    supabase.from("journal_entries").select("date, habits").eq("user_id", user.id).order("date", { ascending: true }),
  ]);

  // health_logs numeric columns come back as strings from PostgREST — coerce once here.
  const logs = (healthLogRows ?? []).map((l) => ({
    date: l.date,
    hrv_rmssd: toNum(l.hrv_rmssd),
    resting_hr: toNum(l.resting_hr),
    deep_sleep_minutes: toNum(l.deep_sleep_minutes),
    total_sleep_minutes: toNum(l.total_sleep_minutes),
  }));

  const tonight: NightlyMetrics = logs[0] ?? { date: today, hrv_rmssd: null, resting_hr: null };
  const recovery = computeRecoveryScore(logs, tonight);

  const intraday = (intradayRows ?? []).map((s) => ({
    recorded_at: s.recorded_at,
    bpm: toNum(s.bpm) ?? 0,
    inWorkout: s.activity_session_id != null,
  }));

  const hrSamples: HrSample[] = intraday.map((s) => ({ recorded_at: s.recorded_at, bpm: s.bpm }));
  const dayStrain = computeDayStrain(hrSamples);

  const last3Nights = logs.slice(0, 3).map((l) => ({ date: l.date, total_sleep_minutes: l.total_sleep_minutes }));
  const sleepTarget = computeSleepTarget(last3Nights, dayStrain.strain);

  const lastNightSleepMinutes = logs[0]?.total_sleep_minutes;
  const sleepScore =
    lastNightSleepMinutes != null
      ? Math.max(0, Math.min(100, Math.round((lastNightSleepMinutes / sleepTarget.targetMinutes) * 100)))
      : null;

  const energyTimeline = intraday.map((s) => ({ minute: s.recorded_at, bpm: s.bpm, activeCalories: null }));
  const battery = computeEnergyBank(energyTimeline, recovery.score ?? DEFAULT_START_BATTERY);

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
    const dayRecovery = computeRecoveryScore(ascLogs.slice(0, i), day);
    return { date: day.date, recovery: dayRecovery.score, deepSleepMinutes: day.deep_sleep_minutes };
  });

  const journalDays: JournalDay[] = (journalRows ?? []).map((j) => ({ date: j.date, habits: j.habits }));
  const correlations = computeHabitCorrelations(journalDays, outcomes);

  const habitsToday = journalDays.find((j) => j.date === today)?.habits ?? [];
  const habitsYesterday = journalDays.find((j) => j.date === yesterday)?.habits ?? [];

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">{formatDate(today)}</h1>

      <HeroHeader
        recovery={recovery}
        strain={dayStrain.strain}
        battery={currentBattery}
        sleepTarget={sleepTarget}
        sleepScore={sleepScore}
      />

      {recovery.confidence !== "full" && (
        <BaselineProgress label="Recovery Score" have={recovery.nightsUsed} need={RECOVERY_BASELINE_TARGET} />
      )}

      <WorkoutRecommender recovery={recovery.score} />

      <section className="rounded border border-black/[.08] p-4 dark:border-white/[.145]">
        <h2 className="mb-3 font-medium">Energy Bank &amp; Stress</h2>
        {chartData.length === 0 ? (
          <p className="text-sm text-foreground/60">No intraday data yet today.</p>
        ) : (
          <StressBatteryChart data={chartData} />
        )}
      </section>

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
