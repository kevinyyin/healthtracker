import { BASELINE_MINUTES } from "@/lib/analytics/sleep-debt";
import { sortByDateAscending } from "@/lib/analytics/stats";
import { ageInYears } from "@/lib/date";

export type BiologicalSex = "male" | "female";

export interface BioAgeNightlyMetrics {
  date: string;
  hrv_rmssd: number | null;
  resting_hr: number | null;
  deep_sleep_minutes: number | null;
  total_sleep_minutes: number | null;
}

export interface BiomarkerFactor {
  key: "hrv" | "resting_hr" | "deep_sleep_pct" | "sleep_duration";
  label: string;
  personalValue: number | null;
  expectedForAge: number | null;
  z: number | null;
  ageAdjustmentYears: number | null;
}

export interface BiologicalAgeResult {
  bioAge: number | null;
  chronoAge: number;
  confidence: "insufficient" | "building" | "full";
  nightsUsed: number;
  factors: BiomarkerFactor[];
}

const BASELINE_WINDOW_DAYS = 30;
const MIN_NIGHTS_BUILDING = 7;
const FULL_CONFIDENCE_NIGHTS = 30;

// Max age-equivalent swing (years) each biomarker can contribute, chosen by how
// age-informative it is per the published trends below — not statistically fit.
// Sums to 12, which is also the final clamp bound (belt-and-suspenders, see bottom).
const MAX_YEARS = {
  hrv: 6,
  resting_hr: 3,
  deep_sleep_pct: 2,
  sleep_duration: 1,
} as const;

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Smooth, saturating conversion from a z-score to a signed age adjustment (years). */
function perBiomarkerYears(z: number, maxYears: number): number {
  return maxYears * Math.tanh(z / 1.5);
}

/** Piecewise-linear interpolation over an ascending-by-age reference table. */
function interpolate(table: readonly (readonly [number, number])[], age: number): number {
  if (age <= table[0][0]) return table[0][1];
  if (age >= table[table.length - 1][0]) return table[table.length - 1][1];

  for (let i = 0; i < table.length - 1; i++) {
    const [age1, val1] = table[i];
    const [age2, val2] = table[i + 1];
    if (age >= age1 && age <= age2) {
      const t = (age - age1) / (age2 - age1);
      return val1 + t * (val2 - val1);
    }
  }
  return table[table.length - 1][1];
}

// Illustrative order-of-magnitude reference curves capturing the published *shape* of
// decline (e.g. Nunan et al. 2010, Umetani et al. 1998 for HRV-by-age; Ohayon et al.
// 2004 for deep-sleep-share-by-age) — not a reproduction of any one study's absolute
// numbers, and nocturnal wearable RMSSD isn't measured the same way as short-term
// resting ECG. This is a wellness heuristic, not a clinical reference range.
const HRV_RMSSD_BY_AGE_MALE_MS: readonly (readonly [number, number])[] = [
  [21, 65],
  [30, 55],
  [40, 45],
  [50, 36],
  [60, 29],
  [70, 24],
  [80, 21],
  [90, 19],
];
const HRV_LOG_SD = 0.4;

const RESTING_HR_BY_AGE_MALE_BPM: readonly (readonly [number, number])[] = [
  [21, 65],
  [30, 63],
  [40, 63],
  [50, 64],
  [60, 65],
  [70, 66],
  [80, 68],
];
const RESTING_HR_SD = 8;
const RESTING_HR_FEMALE_OFFSET = 4;

const DEEP_SLEEP_PCT_BY_AGE: readonly (readonly [number, number])[] = [
  [25, 18],
  [40, 14],
  [55, 11],
  [70, 8],
  [85, 6],
];
const DEEP_SLEEP_PCT_SD = 5;

const SLEEP_DURATION_SD_MINUTES = 60;

function expectedHrv(age: number, sex: BiologicalSex): number {
  const base = interpolate(HRV_RMSSD_BY_AGE_MALE_MS, age);
  if (sex !== "female") return base;
  // Reported convergence toward male values by ~menopause; lowest-confidence adjustment.
  const femaleBoost = age <= 50 ? 0.08 : Math.max(0, 0.08 * (1 - (age - 50) / 20));
  return base * (1 + femaleBoost);
}

function expectedRestingHr(age: number, sex: BiologicalSex): number {
  const base = interpolate(RESTING_HR_BY_AGE_MALE_BPM, age);
  return sex === "female" ? base + RESTING_HR_FEMALE_OFFSET : base;
}

function buildFactor(
  key: BiomarkerFactor["key"],
  label: string,
  personalValue: number | null,
  expectedForAge: number | null,
  z: number | null,
  maxYears: number,
): BiomarkerFactor {
  return {
    key,
    label,
    personalValue,
    expectedForAge,
    z,
    ageAdjustmentYears: z == null ? null : perBiomarkerYears(z, maxYears),
  };
}

/**
 * Estimates a "biological age" by comparing a trailing window of nightly HRV, resting
 * HR, and sleep architecture against published age/sex population trends, expressed as
 * a signed years-of-adjustment from chronological age. This is a wellness heuristic
 * extrapolated from population-level research, not a clinical or epigenetic age test.
 *
 * Uses a wider baseline than recovery-score.ts's 3/14-night gate: biological age is
 * meant to represent a slow-moving trait, so a longer, more stable window is more
 * defensible than reusing the nightly-fluctuation constants verbatim.
 *
 * Dates in `excludedDates` (e.g. flagged Sick/Injured/Traveling via
 * lib/activity-status.ts) are skipped when building the baseline.
 */
export function computeBiologicalAge(
  history: BioAgeNightlyMetrics[],
  asOfDate: string,
  chronoAge: number,
  sex: BiologicalSex,
  excludedDates?: Set<string>,
): BiologicalAgeResult {
  const baseline = sortByDateAscending(history)
    .filter((n) => n.date < asOfDate && !excludedDates?.has(n.date))
    .slice(-BASELINE_WINDOW_DAYS);

  const hrvValues = baseline.map((n) => n.hrv_rmssd).filter((v): v is number => v != null);
  const rhrValues = baseline.map((n) => n.resting_hr).filter((v): v is number => v != null);
  const deepPctValues = baseline
    .filter((n) => n.deep_sleep_minutes != null && n.total_sleep_minutes)
    .map((n) => (n.deep_sleep_minutes! / n.total_sleep_minutes!) * 100);
  const durationValues = baseline.map((n) => n.total_sleep_minutes).filter((v): v is number => v != null);

  const nightsUsed = Math.min(hrvValues.length, rhrValues.length, deepPctValues.length, durationValues.length);

  if (nightsUsed < MIN_NIGHTS_BUILDING) {
    return { bioAge: null, chronoAge, confidence: "insufficient", nightsUsed, factors: [] };
  }

  const personalHrv = mean(hrvValues);
  const personalRhr = mean(rhrValues);
  const personalDeepPct = mean(deepPctValues);
  const personalDuration = mean(durationValues);

  const expHrv = expectedHrv(chronoAge, sex);
  const expRhr = expectedRestingHr(chronoAge, sex);
  const expDeepPct = interpolate(DEEP_SLEEP_PCT_BY_AGE, chronoAge);

  const zHrv = (Math.log(personalHrv) - Math.log(expHrv)) / HRV_LOG_SD;
  // Sign-flipped: lower RHR than expected is good.
  const zRhr = (expRhr - personalRhr) / RESTING_HR_SD;
  const zDeepPct = (personalDeepPct - expDeepPct) / DEEP_SLEEP_PCT_SD;
  const zDuration = (personalDuration - BASELINE_MINUTES) / SLEEP_DURATION_SD_MINUTES;

  const factors: BiomarkerFactor[] = [
    buildFactor("hrv", "HRV (RMSSD)", personalHrv, expHrv, zHrv, MAX_YEARS.hrv),
    buildFactor("resting_hr", "Resting heart rate", personalRhr, expRhr, zRhr, MAX_YEARS.resting_hr),
    buildFactor("deep_sleep_pct", "Deep sleep %", personalDeepPct, expDeepPct, zDeepPct, MAX_YEARS.deep_sleep_pct),
    buildFactor("sleep_duration", "Sleep duration", personalDuration, BASELINE_MINUTES, zDuration, MAX_YEARS.sleep_duration),
  ];

  const totalAdjustment = factors.reduce((sum, f) => sum + (f.ageAdjustmentYears ?? 0), 0);
  const maxSwing = Object.values(MAX_YEARS).reduce((a, b) => a + b, 0);
  const bioAge = Math.min(chronoAge + maxSwing, Math.max(chronoAge - maxSwing, chronoAge - totalAdjustment));

  return {
    bioAge,
    chronoAge,
    confidence: nightsUsed >= FULL_CONFIDENCE_NIGHTS ? "full" : "building",
    nightsUsed,
    factors,
  };
}

/**
 * Biological age for each of the last `trendDays` calendar days present in
 * `logsAscending`, recomputed using only nights strictly before that date as the
 * baseline (mirrors today/page.tsx's per-day historical recovery-score pattern).
 */
export function computeBiologicalAgeTrend(
  logsAscending: BioAgeNightlyMetrics[],
  dob: string,
  sex: BiologicalSex,
  trendDays = 90,
  excludedDates?: Set<string>,
): { date: string; bioAge: number | null; chronoAge: number }[] {
  const dates = logsAscending.map((l) => l.date).slice(-trendDays);

  return dates.map((date) => {
    const chronoAge = ageInYears(dob, date);
    const historyUpToDate = logsAscending.filter((l) => l.date <= date);
    const result = computeBiologicalAge(historyUpToDate, date, chronoAge, sex, excludedDates);
    return { date, bioAge: result.bioAge, chronoAge };
  });
}
