import { DEFAULT_TIMEZONE, localMinutesOfDay } from "@/lib/date";
import { sortByDateAscending } from "@/lib/analytics/stats";

export interface SleepNightMetrics {
  date: string;
  sleep_start: string | null;
  // Despite the name, this is time-in-bed (session end - start), not true time
  // asleep — see rollup.ts and computeSleepTarget in sleep-debt.ts, which is built
  // on the same basis. True asleep time = total_sleep_minutes - awake_minutes.
  total_sleep_minutes: number | null;
  awake_minutes: number | null;
  deep_sleep_minutes: number | null;
  rem_sleep_minutes: number | null;
  wake_count: number | null;
  sleep_latency_minutes: number | null;
  // Optional — Today's page doesn't currently query this column (see hasDataGap below,
  // which treats it as "unknown" rather than assuming 0 when a caller omits it).
  light_sleep_minutes?: number | null;
}

export type SleepFactorKey = "total_sleep" | "efficiency" | "restfulness" | "rem" | "deep" | "latency" | "timing";

export interface SleepScoreFactor {
  key: SleepFactorKey;
  label: string;
  /** This factor's own 0-100 score. Null when its underlying data is missing. */
  score: number | null;
  /** Renormalized weight (percentage points) actually applied — 0 when score is
   *  null, otherwise scaled so all non-null factors' weights sum to 100. */
  weight: number;
  /** The human-meaningful raw number behind the score — minutes, a count, or a
   *  percent depending on `key`. Formatting into display text is a UI concern. */
  rawValue: number | null;
}

export interface SleepScoreResult {
  /** Null only when every factor's score is null, i.e. no usable sleep data at all. */
  score: number | null;
  /** Always all 7, fixed order. */
  factors: SleepScoreFactor[];
  /** Reflects the Timing factor's personal-baseline maturity, capped at "building" if
   *  tonight itself has a data gap (see dataGapTonight) — "full" should mean tonight's
   *  own numbers are trustworthy, not just that the bedtime history is long enough. */
  confidence: "insufficient" | "building" | "full";
  nightsUsed: number;
  /** True when the night's measured stage-minute coverage falls meaningfully short of
   *  its total time-in-bed span — e.g. the watch was off-wrist mid-sleep — so
   *  total_sleep_minutes (a pure end-start span, see rollup.ts) overstates how much was
   *  actually measured. */
  dataGapTonight: boolean;
}

const TIMING_BASELINE_WINDOW_DAYS = 14;
const MIN_NIGHTS_FOR_TIMING = 3;

// Relative emphasis modeled after Oura's publicly described sleep score
// contributors — not reverse-engineered exact weights (Oura doesn't publish them).
// Sums to 100.
const WEIGHTS: Record<SleepFactorKey, number> = {
  total_sleep: 25,
  efficiency: 20,
  restfulness: 15,
  rem: 15,
  deep: 15,
  latency: 5,
  timing: 5,
};

const DATA_GAP_THRESHOLD_MINUTES = 15;

/** True when the night's measured stage-minute coverage falls short of its total
 *  time-in-bed span by more than DATA_GAP_THRESHOLD_MINUTES — e.g. the watch was
 *  off-wrist mid-sleep, so total_sleep_minutes (a pure end-start span, see rollup.ts)
 *  silently overstates how much was actually measured. Only checked when all four
 *  stage fields are present — a night with no stage data at all is a different
 *  (already-handled, via null factor scores) problem, not a "gap." */
function hasDataGap(n: SleepNightMetrics): boolean {
  if (n.total_sleep_minutes == null) return false;
  if (
    n.deep_sleep_minutes == null ||
    n.rem_sleep_minutes == null ||
    n.light_sleep_minutes == null ||
    n.awake_minutes == null
  ) {
    return false;
  }
  const measured = n.deep_sleep_minutes + n.rem_sleep_minutes + n.light_sleep_minutes + n.awake_minutes;
  return n.total_sleep_minutes - measured > DATA_GAP_THRESHOLD_MINUTES;
}

/** True asleep minutes = time-in-bed minus awake time. Null if either input is
 *  missing, or if the subtraction would go negative (bad data). */
function trueAsleepMinutes(n: SleepNightMetrics): number | null {
  if (n.total_sleep_minutes == null || n.awake_minutes == null) return null;
  const asleep = n.total_sleep_minutes - n.awake_minutes;
  return asleep >= 0 ? asleep : null;
}

/**
 * Piecewise-linear score curve: value -> 0-100, defined by ascending-by-value
 * control points. Values outside the table's range clamp to the nearest endpoint's
 * score. Same idea as the `interpolate()` helper in biological-age.ts.
 */
function scoreFromBands(value: number, points: readonly (readonly [number, number])[]): number {
  if (value <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (value >= last[0]) return last[1];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    if (value >= x1 && value <= x2) {
      const t = (value - x1) / (x2 - x1);
      return y1 + t * (y2 - y1);
    }
  }
  return last[1];
}

// --- Total Sleep -------------------------------------------------------------
// Ratio of tonight's total_sleep_minutes (time-in-bed) against the personalized
// target from computeSleepTarget (sleep-debt.ts) — deliberately using the same
// time-in-bed basis the target itself is computed from, not true-asleep minutes,
// since using true-asleep here would double-penalize awake time (already captured
// by Efficiency below). No penalty for oversleeping, consistent with sleep-debt.ts's
// own target logic. Bands approximate Oura's total sleep contributor, not exact
// reverse-engineered constants.
const TOTAL_SLEEP_RATIO_BANDS = [
  [0, 0],
  [0.5, 20],
  [0.75, 55],
  [0.9, 80],
  [1.0, 100],
] as const;

function computeTotalSleepFactor(tonight: SleepNightMetrics, targetMinutes: number) {
  if (tonight.total_sleep_minutes == null || targetMinutes <= 0) return { score: null, rawValue: null };
  const ratio = tonight.total_sleep_minutes / targetMinutes;
  return { score: scoreFromBands(ratio, TOTAL_SLEEP_RATIO_BANDS), rawValue: tonight.total_sleep_minutes };
}

// --- Efficiency ----------------------------------------------------------------
// True-asleep share of time-in-bed. Approximate bands modeled on Oura's public
// description (~85-90%+ considered good/excellent).
const EFFICIENCY_BANDS = [
  [50, 10],
  [70, 40],
  [80, 65],
  [85, 80],
  [90, 95],
  [95, 100],
  [100, 100],
] as const;

function computeEfficiencyFactor(tonight: SleepNightMetrics, trueAsleep: number | null) {
  if (trueAsleep == null || tonight.total_sleep_minutes == null || tonight.total_sleep_minutes <= 0) {
    return { score: null, rawValue: null };
  }
  const pct = (trueAsleep / tonight.total_sleep_minutes) * 100;
  return { score: scoreFromBands(pct, EFFICIENCY_BANDS), rawValue: pct };
}

// --- Restfulness -----------------------------------------------------------------
// Mid-sleep disturbances (rollup.ts's wake_count) per hour of true sleep, so a long
// night isn't penalized more than a short one for the same wake-up count. Coarser
// than a ring's actual movement-sensor-based restfulness — this is a proxy.
const WAKES_PER_HOUR_BANDS = [
  [0, 100],
  [0.5, 90],
  [1, 75],
  [2, 55],
  [3, 35],
  [5, 15],
  [8, 0],
] as const;

function computeRestfulnessFactor(tonight: SleepNightMetrics, trueAsleep: number | null) {
  if (tonight.wake_count == null || trueAsleep == null || trueAsleep <= 0) return { score: null, rawValue: null };
  const wakesPerHour = tonight.wake_count / (trueAsleep / 60);
  return { score: scoreFromBands(wakesPerHour, WAKES_PER_HOUR_BANDS), rawValue: tonight.wake_count };
}

// --- REM -------------------------------------------------------------------------
// REM % of true sleep. ~20-25% modeled as ideal, per commonly cited sleep-stage
// research and Oura's public description; too little or (mildly) too much both
// score down.
const REM_PCT_BANDS = [
  [0, 20],
  [10, 50],
  [15, 75],
  [20, 95],
  [22, 100],
  [25, 100],
  [30, 90],
  [40, 70],
  [50, 50],
] as const;

function computeRemFactor(tonight: SleepNightMetrics, trueAsleep: number | null) {
  if (tonight.rem_sleep_minutes == null || trueAsleep == null || trueAsleep <= 0) return { score: null, rawValue: null };
  const pct = (tonight.rem_sleep_minutes / trueAsleep) * 100;
  return { score: scoreFromBands(pct, REM_PCT_BANDS), rawValue: pct };
}

// --- Deep --------------------------------------------------------------------------
// Deep % of true sleep. ~13-23% modeled as ideal.
const DEEP_PCT_BANDS = [
  [0, 20],
  [5, 45],
  [8, 65],
  [13, 90],
  [16, 100],
  [20, 100],
  [23, 95],
  [28, 80],
  [35, 60],
] as const;

function computeDeepFactor(tonight: SleepNightMetrics, trueAsleep: number | null) {
  if (tonight.deep_sleep_minutes == null || trueAsleep == null || trueAsleep <= 0) return { score: null, rawValue: null };
  const pct = (tonight.deep_sleep_minutes / trueAsleep) * 100;
  return { score: scoreFromBands(pct, DEEP_PCT_BANDS), rawValue: pct };
}

// --- Latency -------------------------------------------------------------------------
// Minutes from lying down to sleep onset (rollup.ts's sleep_latency_minutes). ~5-20
// min modeled as ideal; near-zero latency scores a little lower too, since it can
// indicate sleep deprivation rather than being "better."
const LATENCY_BANDS = [
  [0, 70],
  [5, 90],
  [10, 100],
  [20, 100],
  [30, 80],
  [45, 55],
  [60, 35],
  [90, 15],
  [120, 0],
] as const;

function computeLatencyFactor(tonight: SleepNightMetrics) {
  if (tonight.sleep_latency_minutes == null) return { score: null, rawValue: null };
  return { score: scoreFromBands(tonight.sleep_latency_minutes, LATENCY_BANDS), rawValue: tonight.sleep_latency_minutes };
}

// --- Timing --------------------------------------------------------------------------
// The one genuinely personal-baseline factor: compares tonight's bedtime to the
// user's own historical average, since there's no external chronotype reference.
const TIMING_DEVIATION_BANDS = [
  [0, 100],
  [30, 95],
  [60, 80],
  [90, 60],
  [120, 40],
  [180, 15],
  [240, 0],
] as const;

/**
 * Puts a bedtime's minutes-of-day on a continuous evening-to-early-morning scale
 * (e.g. 23:30 -> 1410, 00:15 -> 1455) so distance-from-baseline near midnight is
 * meaningful. A documented simplification, not true circular statistics — consistent
 * with lib/date.ts's own documented DST approximation on localDayStartIso. Assumes
 * bedtimes fall in the evening-through-noon range, which covers realistic bedtimes.
 */
function continuousBedtimeMinutes(iso: string, timezone: string): number {
  const minutes = localMinutesOfDay(iso, timezone);
  return minutes < 12 * 60 ? minutes + 1440 : minutes;
}

function computeTimingFactor(
  history: SleepNightMetrics[],
  tonight: SleepNightMetrics,
  excludedDates: Set<string> | undefined,
  timezone: string,
) {
  const baseline = sortByDateAscending(history)
    .filter((n) => n.date < tonight.date && !excludedDates?.has(n.date) && n.sleep_start != null)
    .slice(-TIMING_BASELINE_WINDOW_DAYS);

  const nightsUsed = baseline.length;

  if (tonight.sleep_start == null || nightsUsed < MIN_NIGHTS_FOR_TIMING) {
    return { score: null, rawValue: null, nightsUsed };
  }

  const baselineMinutes = baseline.map((n) => continuousBedtimeMinutes(n.sleep_start!, timezone));
  const baselineMean = baselineMinutes.reduce((sum, v) => sum + v, 0) / baselineMinutes.length;
  const deviation = Math.abs(continuousBedtimeMinutes(tonight.sleep_start, timezone) - baselineMean);

  return { score: scoreFromBands(deviation, TIMING_DEVIATION_BANDS), rawValue: deviation, nightsUsed };
}

interface RawFactor {
  key: SleepFactorKey;
  label: string;
  baseWeight: number;
  score: number | null;
  rawValue: number | null;
}

/**
 * Computes a 7-factor sleep score modeled after Oura's publicly described sleep
 * score contributors (Total Sleep, Efficiency, Restfulness, REM Sleep, Deep Sleep,
 * Latency, Timing), replacing a naive (actual/target)*100 calculation. Each factor
 * scores independently against a fixed physiological band (not a personal baseline)
 * except Timing, which compares tonight's bedtime to the user's own trailing average.
 *
 * Any factor whose underlying data is missing is excluded, and the remaining
 * factors' weights are renormalized to sum to 100 — so a night with partial data
 * (e.g. no wake_count/sleep_latency_minutes yet, see rollup.ts's 3-day self-heal
 * window) still gets an honest score from what's available, rather than an
 * all-or-nothing gate. Overall `score` is null only when every factor is null.
 */
export function computeSleepScore(
  history: SleepNightMetrics[],
  tonight: SleepNightMetrics,
  targetMinutes: number,
  excludedDates?: Set<string>,
  timezone: string = DEFAULT_TIMEZONE,
): SleepScoreResult {
  const trueAsleep = trueAsleepMinutes(tonight);

  const totalSleep = computeTotalSleepFactor(tonight, targetMinutes);
  const efficiency = computeEfficiencyFactor(tonight, trueAsleep);
  const restfulness = computeRestfulnessFactor(tonight, trueAsleep);
  const rem = computeRemFactor(tonight, trueAsleep);
  const deep = computeDeepFactor(tonight, trueAsleep);
  const latency = computeLatencyFactor(tonight);
  const timing = computeTimingFactor(history, tonight, excludedDates, timezone);

  const rawFactors: RawFactor[] = [
    { key: "total_sleep", label: "Total Sleep", baseWeight: WEIGHTS.total_sleep, ...totalSleep },
    { key: "efficiency", label: "Efficiency", baseWeight: WEIGHTS.efficiency, ...efficiency },
    { key: "restfulness", label: "Restfulness", baseWeight: WEIGHTS.restfulness, ...restfulness },
    { key: "rem", label: "REM Sleep", baseWeight: WEIGHTS.rem, ...rem },
    { key: "deep", label: "Deep Sleep", baseWeight: WEIGHTS.deep, ...deep },
    { key: "latency", label: "Latency", baseWeight: WEIGHTS.latency, ...latency },
    { key: "timing", label: "Timing", baseWeight: WEIGHTS.timing, score: timing.score, rawValue: timing.rawValue },
  ];

  const usableWeightSum = rawFactors.reduce((sum, f) => sum + (f.score != null ? f.baseWeight : 0), 0);

  const factors: SleepScoreFactor[] = rawFactors.map((f) => ({
    key: f.key,
    label: f.label,
    score: f.score,
    weight: f.score != null && usableWeightSum > 0 ? (f.baseWeight / usableWeightSum) * 100 : 0,
    rawValue: f.rawValue,
  }));

  const rawScore =
    usableWeightSum === 0 ? null : factors.reduce((sum, f) => sum + (f.score ?? 0) * (f.weight / 100), 0);

  const baseConfidence: SleepScoreResult["confidence"] =
    timing.nightsUsed >= TIMING_BASELINE_WINDOW_DAYS
      ? "full"
      : timing.nightsUsed >= MIN_NIGHTS_FOR_TIMING
        ? "building"
        : "insufficient";

  const dataGapTonight = hasDataGap(tonight);
  // "full" should mean tonight's own numbers are trustworthy, not just that the
  // bedtime baseline is mature — a gappy night caps confidence one tier down.
  const confidence = dataGapTonight && baseConfidence === "full" ? "building" : baseConfidence;

  return {
    score: rawScore == null ? null : Math.max(0, Math.min(100, Math.round(rawScore))),
    factors,
    confidence,
    nightsUsed: timing.nightsUsed,
    dataGapTonight,
  };
}
