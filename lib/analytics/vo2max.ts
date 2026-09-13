import { sortByDateAscending } from "@/lib/analytics/stats";

export interface Vo2MaxNightlyMetrics {
  date: string;
  resting_hr: number | null;
}

export interface Vo2MaxResult {
  /** ml/kg/min — a non-exercise ESTIMATE, not a measured/exercise-tested VO2max. */
  vo2max: number | null;
  confidence: "insufficient" | "building" | "full";
  nightsUsed: number;
  restingHrBaseline: number | null;
  maxHr: number;
}

const BASELINE_WINDOW_DAYS = 30;
const MIN_NIGHTS_BUILDING = 7;
const FULL_CONFIDENCE_NIGHTS = 30;

// Plausible adult range — clamps a single unusual resting-HR baseline (or an
// extreme max-HR override) from producing an absurd headline number.
const VO2MAX_MIN = 20;
const VO2MAX_MAX = 70;

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Non-exercise VO2max estimate (Uth–Sørensen–Overgaard–Pedersen, 2004):
 * vo2max ≈ 15.3 × (maxHR / restingHR). Uses a trailing resting-HR baseline the same
 * way biological-age.ts uses a trailing HRV/RHR baseline — VO2max is a slow-moving
 * trait, so a longer, more stable window is more defensible than a single night's
 * reading. This is a rough approximation from heart rate alone, not a lab or
 * treadmill-tested VO2max — UI surfacing this value must label it as an estimate.
 *
 * Dates in `excludedDates` (e.g. flagged Sick/Injured/Traveling via
 * lib/activity-status.ts) are skipped when building the baseline.
 */
export function computeVo2Max(
  history: Vo2MaxNightlyMetrics[],
  asOfDate: string,
  maxHr: number,
  excludedDates?: Set<string>,
): Vo2MaxResult {
  const baseline = sortByDateAscending(history)
    .filter((n) => n.date < asOfDate && !excludedDates?.has(n.date))
    .slice(-BASELINE_WINDOW_DAYS);

  const rhrValues = baseline.map((n) => n.resting_hr).filter((v): v is number => v != null);
  const nightsUsed = rhrValues.length;

  if (nightsUsed < MIN_NIGHTS_BUILDING) {
    return { vo2max: null, confidence: "insufficient", nightsUsed, restingHrBaseline: null, maxHr };
  }

  const restingHrBaseline = mean(rhrValues);
  const raw = 15.3 * (maxHr / restingHrBaseline);
  const vo2max = Math.min(VO2MAX_MAX, Math.max(VO2MAX_MIN, raw));

  return {
    vo2max,
    confidence: nightsUsed >= FULL_CONFIDENCE_NIGHTS ? "full" : "building",
    nightsUsed,
    restingHrBaseline,
    maxHr,
  };
}

/**
 * VO2max estimate for each of the last `trendDays` calendar days present in
 * `logsAscending`, recomputed using only nights strictly before that date as the
 * baseline (mirrors computeBiologicalAgeTrend's per-day historical pattern).
 */
export function computeVo2MaxTrend(
  logsAscending: Vo2MaxNightlyMetrics[],
  maxHr: number,
  trendDays = 90,
  excludedDates?: Set<string>,
): { date: string; vo2max: number | null }[] {
  const dates = logsAscending.map((l) => l.date).slice(-trendDays);

  return dates.map((date) => {
    const historyUpToDate = logsAscending.filter((l) => l.date <= date);
    const result = computeVo2Max(historyUpToDate, date, maxHr, excludedDates);
    return { date, vo2max: result.vo2max };
  });
}
