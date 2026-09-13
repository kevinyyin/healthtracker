import { computeRecoveryScore } from "@/lib/analytics/recovery-score";
import { computeSleepScore } from "@/lib/analytics/sleep-score";
import { computeSleepTarget, type SleepNight } from "@/lib/analytics/sleep-debt";
import { computeIllnessSignal } from "@/lib/analytics/illness-signal";
import { computeBiologicalAge, type BiologicalSex } from "@/lib/analytics/biological-age";
import {
  computeHabitCorrelations,
  type JournalDay,
  type OutcomeDay,
  type HabitCorrelation,
} from "@/lib/analytics/habit-correlations";
import { mean, maxBy } from "@/lib/analytics/stats";
import { ageInYears, DEFAULT_TIMEZONE } from "@/lib/date";

/** Everything a recap needs from one night's health_logs row (mirrors today/page.tsx's shape). */
export interface RecapNightlyMetrics {
  date: string;
  hrv_rmssd: number | null;
  resting_hr: number | null;
  spo2: number | null;
  sleep_start: string | null;
  total_sleep_minutes: number | null;
  deep_sleep_minutes: number | null;
  rem_sleep_minutes: number | null;
  awake_minutes: number | null;
  wake_count: number | null;
  sleep_latency_minutes: number | null;
}

export interface RecapDayHighlight {
  date: string;
  value: number;
}

export interface RecapSummary {
  periodStart: string;
  periodEnd: string;
  nightsWithData: number;
  avgRecovery: number | null;
  avgSleepScore: number | null;
  sleepDebtEndMinutes: number | null;
  /** Positive = biological age improved (dropped further below chronological age) by
   *  period end compared to period start. Null if there's no profile or insufficient
   *  baseline at either end. */
  bioAgeDeltaYears: number | null;
  bestRecoveryDay: RecapDayHighlight | null;
  worstRecoveryDay: RecapDayHighlight | null;
  /** value = total_sleep_minutes (time-in-bed), matching sleep-score.ts's own basis. */
  longestSleepNight: RecapDayHighlight | null;
  topHabitCorrelations: HabitCorrelation[];
  illnessFlaggedDays: number;
  lowRecoveryDays: number;
}

// Matches day-strain.ts's recommendTargetStrain "Low recovery" band and
// lib/google-health/alerts.ts's alert threshold — kept as a local constant rather
// than a shared export since these three call sites don't otherwise depend on
// each other and a shared config module would be overkill for one number.
const LOW_RECOVERY_THRESHOLD = 34;
const TOP_CORRELATIONS_COUNT = 3;

/**
 * Aggregates Recovery, Sleep Score, sleep debt, Biological Age, illness signal, and
 * habit correlations over [periodStart, periodEnd], recomputing each day's score from
 * only its own preceding history — the same per-day historical pattern
 * trends/page.tsx and biological-age.ts's computeBiologicalAgeTrend already use, just
 * aggregated into period-level stats instead of a day-by-day series.
 *
 * `logsAscending` should include enough lookback before `periodStart` for those
 * per-day baselines to be seeded (the caller's job, same BASELINE_BUFFER_DAYS idea
 * trends/page.tsx uses) — nights strictly before `periodStart` are only used as
 * history, never counted into the period's own stats.
 *
 * Day Strain/Energy Bank are deliberately NOT included here: they're computed live
 * from intraday_hr minute samples (see today/page.tsx), never persisted, and pulling
 * a year of intraday data into this aggregation would be prohibitively expensive for
 * a page render — the caller (recap page) computes an average Strain separately, only
 * for the cheaper Week/Month periods, from its own intraday_hr query.
 */
export function computeRecapSummary(
  logsAscending: RecapNightlyMetrics[],
  journalDays: JournalDay[],
  excludedDates: Set<string>,
  periodStart: string,
  periodEnd: string,
  dob: string | null,
  sex: BiologicalSex | null,
  timezone: string = DEFAULT_TIMEZONE,
): RecapSummary {
  const visible = logsAscending.filter(
    (l) => l.date >= periodStart && l.date <= periodEnd && !excludedDates.has(l.date),
  );

  const recoveryByDate = new Map<string, number | null>();
  let illnessFlaggedDays = 0;
  let lowRecoveryDays = 0;

  for (const day of visible) {
    const history = logsAscending.filter((l) => l.date < day.date);

    const recovery = computeRecoveryScore(history, day, excludedDates);
    recoveryByDate.set(day.date, recovery.score);
    if (recovery.score != null && recovery.score < LOW_RECOVERY_THRESHOLD) lowRecoveryDays++;

    const illness = computeIllnessSignal(history, day, excludedDates);
    if (illness.flagged) illnessFlaggedDays++;
  }

  const sleepScoreByDate = new Map<string, number | null>();
  for (const day of visible) {
    const history = logsAscending.filter((l) => l.date < day.date);
    const last3Nights: SleepNight[] = history.slice(-3).map((l) => ({ date: l.date, total_sleep_minutes: l.total_sleep_minutes }));
    // No Strain input available at this level (see the Day Strain note above) — null
    // matches today/page.tsx's own fallback (`?? 0` inside computeSleepTarget) when
    // strain isn't in scope.
    const sleepTarget = computeSleepTarget(last3Nights, null);
    const sleepScore = computeSleepScore(history, day, sleepTarget.targetMinutes, excludedDates, timezone);
    sleepScoreByDate.set(day.date, sleepScore.score);
  }

  const recoveryValues = [...recoveryByDate.values()].filter((v): v is number => v != null);
  const sleepScoreValues = [...sleepScoreByDate.values()].filter((v): v is number => v != null);

  const last3AtEnd: SleepNight[] = logsAscending
    .filter((l) => l.date <= periodEnd)
    .slice(-3)
    .map((l) => ({ date: l.date, total_sleep_minutes: l.total_sleep_minutes }));
  const sleepDebtEndMinutes = logsAscending.length > 0 ? computeSleepTarget(last3AtEnd, null).debtMinutes : null;

  let bioAgeDeltaYears: number | null = null;
  if (dob != null && sex != null) {
    const startResult = computeBiologicalAge(logsAscending, periodStart, ageInYears(dob, periodStart), sex, excludedDates);
    const endResult = computeBiologicalAge(logsAscending, periodEnd, ageInYears(dob, periodEnd), sex, excludedDates);
    if (startResult.bioAge != null && endResult.bioAge != null) {
      const startYounger = startResult.chronoAge - startResult.bioAge;
      const endYounger = endResult.chronoAge - endResult.bioAge;
      bioAgeDeltaYears = endYounger - startYounger;
    }
  }

  const bestRecoveryEntry = maxBy([...recoveryByDate.entries()], ([, value]) => value);
  const worstRecoveryEntry = maxBy([...recoveryByDate.entries()], ([, value]) => (value == null ? null : -value));
  const longestSleepDay = maxBy(visible, (d) => d.total_sleep_minutes);

  // Habit correlations are scoped to habits logged within the period, but outcomes
  // are looked up across the full available history so a habit logged near the
  // period boundary can still resolve its next-day outcome correctly.
  const ascLogsAll = [...logsAscending].sort((a, b) => (a.date < b.date ? -1 : 1));
  const fullOutcomes: OutcomeDay[] = ascLogsAll.map((day, i) => {
    const dayRecovery = computeRecoveryScore(ascLogsAll.slice(0, i), day, excludedDates);
    return { date: day.date, recovery: dayRecovery.score, deepSleepMinutes: day.deep_sleep_minutes };
  });
  const periodJournalDays = journalDays.filter((j) => j.date >= periodStart && j.date <= periodEnd);
  const topHabitCorrelations = computeHabitCorrelations(periodJournalDays, fullOutcomes, excludedDates)
    .filter((c) => c.confidence === "low")
    .sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect))
    .slice(0, TOP_CORRELATIONS_COUNT);

  return {
    periodStart,
    periodEnd,
    nightsWithData: visible.length,
    avgRecovery: recoveryValues.length > 0 ? mean(recoveryValues) : null,
    avgSleepScore: sleepScoreValues.length > 0 ? mean(sleepScoreValues) : null,
    sleepDebtEndMinutes,
    bioAgeDeltaYears,
    bestRecoveryDay: bestRecoveryEntry ? { date: bestRecoveryEntry[0], value: bestRecoveryEntry[1]! } : null,
    worstRecoveryDay: worstRecoveryEntry ? { date: worstRecoveryEntry[0], value: worstRecoveryEntry[1]! } : null,
    longestSleepNight: longestSleepDay ? { date: longestSleepDay.date, value: longestSleepDay.total_sleep_minutes! } : null,
    topHabitCorrelations,
    illnessFlaggedDays,
    lowRecoveryDays,
  };
}
